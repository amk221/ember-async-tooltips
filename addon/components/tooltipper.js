import Component from '@glimmer/component';
import { action } from '@ember/object';
import { cancel, later } from '@ember/runloop';
import { getPosition, getCoords } from '@zestia/position-utils';
import { guidFor } from '@ember/object/internals';
import { dasherize } from '@ember/string';
import { htmlSafe } from '@ember/template';
import { inject } from '@ember/service';
import { defer, resolve } from 'rsvp';
import { tracked } from '@glimmer/tracking';
import autoPosition from '../utils/auto-position';
import { modifier } from 'ember-modifier';

export default class TooltipperComponent extends Component {
  @inject('tooltip') tooltipService;

  @tracked isLoading = false;
  @tracked loadedData = null;
  @tracked loadError = null;
  @tracked shouldRenderTooltip = false;
  @tracked shouldShowTooltip = false;
  @tracked tooltipCoords = [0, 0];
  @tracked tooltipPosition = null;

  isLoaded = false;
  isOverReferenceElement = false;
  isOverTooltipElement = false;
  loadEndTime = 0;
  loadStartTime = 0;
  referenceElement = null;
  tooltipElement = null;
  tooltipperElement = null;
  willAnimateTooltip = null;
  willInsertTooltip = null;

  tooltipperLifecycle = modifier((element) => {
    this._handleInsertTooltipper(element);
    return () => this._handleDestroyTooltipper();
  });

  tooltipLifecycle = modifier((element) => {
    this._handleInsertTooltip(element);
    return () => this._handleDestroyTooltip();
  });

  handleUpdatedArguments = modifier(() => {
    this._setupReferenceElement();
    this._maybeToggleViaArgument();
    this._positionTooltip();
  });

  get id() {
    return guidFor(this).replace('ember', '');
  }

  get columns() {
    return this.args.columns ?? 3;
  }

  get rows() {
    return this.args.rows ?? 3;
  }

  get shouldUseMouseEvents() {
    return this.args.mouseEvents ?? true;
  }

  get tooltipStyle() {
    const [x, y] = this.tooltipCoords;

    return htmlSafe(`top: ${y}px; left: ${x}px`);
  }

  get tooltipPositionClass() {
    return dasherize(this.tooltipPosition);
  }

  get loadDelay() {
    return this.loadEndTime - this.loadStartTime;
  }

  get hideDelay() {
    return this.args.hideDelay ?? 0;
  }

  get showDelay() {
    return this.args.showDelay ?? 0;
  }

  get showRemainder() {
    if (this.loadDelay > this.showDelay) {
      return 0;
    } else {
      return this.showDelay - this.loadDelay;
    }
  }

  get needsToShow() {
    return this.isOverReferenceElement || this.isOverTooltipElement;
  }

  get tooltippers() {
    return this.tooltipService.tooltippers.filter((tooltipper) => {
      return tooltipper !== this;
    });
  }

  get renderedChild() {
    return this.tooltippers.find((tooltipper) => {
      return this.referenceElement.contains(tooltipper.referenceElement);
    });
  }

  get renderedParent() {
    return this.tooltippers.find((tooltipper) => {
      return tooltipper.referenceElement.contains(this.referenceElement);
    });
  }

  get hasChild() {
    return !!this.renderedChild;
  }

  get tooltipperAPI() {
    return {
      isLoading: this.isLoading,
      showTooltip: this.showTooltip,
      hideTooltip: this.hideTooltip,
      toggleTooltip: this.toggleTooltip,
      repositionTooltip: this.repositionTooltip
    };
  }

  get tooltipAPI() {
    return {
      data: this.loadedData,
      error: this.loadError,
      hide: this.hideTooltip,
      reposition: this.repositionTooltip
    };
  }

  @action
  handleMouseEnterReferenceElement() {
    this.isOverReferenceElement = true;

    this._loadOnce().then(() => this._scheduleShowTooltip());
  }

  @action
  handleMouseLeaveReferenceElement() {
    this.isOverReferenceElement = false;

    this._scheduleHideTooltip();
  }

  @action
  handleMouseEnterTooltip() {
    this.isOverTooltipElement = true;
  }

  @action
  handleMouseLeaveTooltip() {
    this.isOverTooltipElement = false;

    if (!this.shouldUseMouseEvents) {
      return;
    }

    this._scheduleHideTooltip();
  }

  @action
  handleAnimatedTooltip(event) {
    if (event.target === this.tooltipElement) {
      this.willAnimateTooltip.resolve();
    }
  }

  @action
  hideTooltip() {
    return this._hideTooltip();
  }

  @action
  showTooltip() {
    this._showTooltip();
  }

  @action
  toggleTooltip() {
    if (this.shouldRenderTooltip) {
      this._hideTooltip();
    } else {
      this._showTooltip();
    }
  }

  @action
  repositionTooltip() {
    this._positionTooltip();
  }

  _handleInsertTooltipper(element) {
    this.tooltipperElement = element;
    this._setupReferenceElement();
    this._maybeToggleViaArgument();
  }

  _handleDestroyTooltipper() {
    this._cancelTimers();
    this._teardownReferenceElement();
  }

  _handleInsertTooltip(element) {
    this.tooltipElement = element;
    this.tooltipService.add(this);
    this._positionTooltip();
    this.willInsertTooltip.resolve();
  }

  _handleDestroyTooltip() {
    this.tooltipElement = null;
    this.isOverTooltipElement = false;
    this.tooltipService.remove(this);
  }

  _maybeToggleViaArgument() {
    if (this.args.showTooltip === true) {
      this._showTooltip();
    } else if (this.args.showTooltip === false) {
      this._hideTooltip();
    }
  }

  _startListening() {
    const add = (...args) => this.referenceElement.addEventListener(...args);

    add('mouseenter', this.handleMouseEnterReferenceElement);
    add('mouseleave', this.handleMouseLeaveReferenceElement);
  }

  _stopListening() {
    const remove = (...args) =>
      this.referenceElement.removeEventListener(...args);

    remove('mouseenter', this.handleMouseEnterReferenceElement);
    remove('mouseleave', this.handleMouseLeaveReferenceElement);
  }

  _load(data) {
    this._loadStarted();

    return resolve(data)
      .then(this._loadedData.bind(this))
      .catch(this._loadError.bind(this))
      .finally(this._loadFinished.bind(this));
  }

  _loadOnce() {
    if (this.isLoading) {
      return new Promise(() => {});
    } else if (this.isLoaded) {
      return this._load(this.loadedData);
    } else if (typeof this.args.onLoad === 'function') {
      return this._load(this.args.onLoad());
    } else {
      return resolve();
    }
  }

  _loadStarted() {
    this.loadStartTime = Date.now();
    this.isLoading = true;
  }

  _loadFinished() {
    this.loadEndTime = Date.now();
    this.isLoading = false;
  }

  _loadedData(data) {
    this.loadedData = data;
    this.loadError = null;
    this.isLoaded = true;
  }

  _loadError(error) {
    this.loadError = error;
    this.loadedData = null;
    this.isLoaded = false;
  }

  _scheduleShowTooltip() {
    this._cancelTimers();

    this.showTimer = later(this, '_attemptShowTooltip', this.showRemainder);
  }

  _attemptShowTooltip() {
    if (this.isDestroyed || !this.needsToShow || this.hasChild) {
      return;
    }

    if (this.renderedParent) {
      this.renderedParent.hideTooltip();
    }

    this._showTooltip();
  }

  _showTooltip() {
    this.shouldShowTooltip = true;

    if (this.shouldRenderTooltip) {
      return;
    }

    this._loadOnce()
      .then(() => this._renderTooltip())
      .then(() => this._waitForAnimation())
      .then(() => this.args.onShowTooltip?.());
  }

  _renderTooltip() {
    this.willInsertTooltip = defer();
    this.shouldRenderTooltip = true;

    return this.willInsertTooltip.promise;
  }

  _scheduleHideTooltip() {
    this._cancelTimers();

    this.hideTimer = later(this, '_attemptHideTooltip', this.hideDelay);
  }

  _attemptHideTooltip() {
    if (this.needsToShow) {
      return;
    }

    this._hideTooltip();
  }

  _hideTooltip() {
    if (!this.tooltipElement) {
      return;
    }

    this.shouldShowTooltip = false;

    return this._waitForAnimation().then(() => {
      this.args.onHideTooltip?.();
      this._attemptDestroyTooltip();
    });
  }

  _cancelTimers() {
    cancel(this.showTimer);
    cancel(this.hideTimer);
  }

  _waitForAnimation() {
    this.willAnimateTooltip = defer();
    return this.willAnimateTooltip.promise;
  }

  _attemptDestroyTooltip() {
    if (this.shouldShowTooltip) {
      return;
    }

    this._destroyTooltip();
  }

  _destroyTooltip() {
    this.shouldRenderTooltip = false;
  }

  _setupReferenceElement() {
    this._teardownReferenceElement();

    this.referenceElement =
      this.args.referenceElement ?? this.tooltipperElement;

    if (!this.shouldUseMouseEvents) {
      return;
    }

    this._startListening();
  }

  _teardownReferenceElement() {
    if (!this.referenceElement) {
      return;
    }

    this._stopListening();
    this.referenceElement = null;
  }

  _getReferencePosition() {
    // Get the rough position of the reference element in the viewport by
    // splitting it in to a grid of rows and columns and choosing a square.

    return getPosition(this.referenceElement, window, this.columns, this.rows);
  }

  _computeCoords(position) {
    // Compute the coordinates required to place the tooltip element at the
    // given position near the reference element.

    return getCoords(position, this.tooltipElement, this.referenceElement);
  }

  _decideTooltipPosition(referencePosition) {
    // The position of the tooltip should be the one provided, or one chosen
    // automatically, based upon the position of the reference element.

    const { position } = this.args;

    if (typeof position === 'string') {
      return position;
    } else if (typeof position === 'function') {
      return position(referencePosition);
    } else {
      return autoPosition(referencePosition);
    }
  }

  _positionTooltip() {
    if (!this.tooltipElement || !this.referenceElement) {
      return;
    }

    const referencePosition = this._getReferencePosition();

    const tooltipPosition = this._decideTooltipPosition(referencePosition);

    this.tooltipCoords = this._computeCoords(tooltipPosition);

    this.tooltipPosition = tooltipPosition;
  }
}
