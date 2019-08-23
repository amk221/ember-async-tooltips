import { Promise } from 'rsvp';
import Component from '@ember/component';
import { scheduleOnce } from '@ember/runloop';
import layout from '../templates/components/tool-tip';
import { dasherize } from '@ember/string';
import autoPosition from '../utils/auto-position';
import { getPosition, getCoords } from '@zestia/position-utils';

export default Component.extend({
  layout,

  classNames: ['tooltip'],

  classNameBindings: ['isShowing:is-showing:is-hiding', 'positionClass'],

  attributeBindings: ['role'],

  role: 'tooltip',
  rows: 3,
  columns: 3,
  adjust: true,
  isShowing: true,
  isOver: false,
  tooltipperInstance: null,

  _onInsert() {},
  _onMouseLeave() {},
  _onHide() {},

  didInsertElement() {
    this._super(...arguments);
    scheduleOnce('afterRender', this, '_inserted');
  },

  didRender() {
    this._super(...arguments);
    scheduleOnce('afterRender', this, '_position');
  },

  actions: {
    hide() {
      return this._hide().then(() => this._onHide());
    }
  },

  mouseEnter() {
    this._super(...arguments);
    this.set('isOver', true);
  },

  mouseLeave() {
    this._super(...arguments);
    this.set('isOver', false);
    this._onMouseLeave();
  },

  _show() {
    this.set('isShowing', true);
  },

  _hide() {
    return new Promise(resolve => {
      this.one('animationEnd', resolve);
      this.set('isShowing', false);
    });
  },

  _inserted() {
    this._onInsert(this);
  },

  _position() {
    if (!this.tooltipperInstance) {
      return;
    }

    const tooltip = this.element;
    const tooltipper = this.tooltipperInstance.referenceElement;
    const container = this.adjust ? window : null;

    const tooltipperPosition = getPosition(
      tooltipper,
      window,
      this.columns,
      this.rows
    );

    const tooltipPosition = this.position
      ? this.position
      : autoPosition(tooltipperPosition);

    const tooltipCoords = getCoords(
      tooltipPosition,
      tooltip,
      tooltipper,
      container
    );

    const { top, left, position: adjustedPosition } = tooltipCoords;

    this.set('positionClass', `is-${dasherize(adjustedPosition)}`);

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }
});
