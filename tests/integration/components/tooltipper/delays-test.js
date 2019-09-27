import { module, test } from 'qunit';
import setupTooltipperTest from './setup';
import { render, triggerEvent } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { later } from '@ember/runloop';

module('tooltipper', function(hooks) {
  setupTooltipperTest(hooks);

  hooks.beforeEach(function() {
    this.tooltipService = this.owner.lookup('service:tooltip');
  });

  test('load less than show delay', async function(assert) {
    assert.expect(3);

    this.load = () => {
      return new Promise(resolve => {
        later(resolve, 50);
      });
    };

    await render(hbs`
      <Tooltipper
        @tooltip={{component "tooltip"}}
        @onLoad={{this.load}}
        @showDelay={{100}} />
    `);

    assert.dom('.tooltip').doesNotExist('does not render tooltip');

    this.startTimer();

    await triggerEvent('.tooltipper', 'mouseenter');

    this.stopTimer();

    assert
      .dom('.tooltip')
      .exists('renders tooltip when mousing over the toolipper');

    assert.ok(this.timeTaken() >= 100, 'will render after the show delay');
  });

  test('load delay more than show delay', async function(assert) {
    assert.expect(3);

    this.load = () => {
      return new Promise(resolve => {
        later(resolve, 200);
      });
    };

    await render(hbs`
      <Tooltipper
        @tooltip={{component "tooltip"}}
        @onLoad={{this.load}}
        @showDelay={{100}} />
    `);

    assert.dom('.tooltip').doesNotExist('does not render tooltip');

    this.startTimer();

    await triggerEvent('.tooltipper', 'mouseenter');

    this.stopTimer();

    assert
      .dom('.tooltip')
      .exists('renders tooltip when mousing over the toolipper');

    assert.ok(
      this.timeTaken() >= 200,
      'will render after the load time, because it exceeded the show delay'
    );
  });

  test('hide delay', async function(assert) {
    assert.expect(4);

    await render(hbs`
      <Tooltipper
        @showTooltip={{true}}
        @tooltip={{component "tooltip"}}
        @hideDelay={{100}} />
    `);

    this.startTimer();

    await triggerEvent('.tooltipper', 'mouseleave');

    assert.dom('.tooltip').exists('tooltip still present on mouseleave');

    this.stopTimer();

    assert.ok(
      this.timeTaken() >= 100 && this.timeTaken() <= 120,
      'approximately 100ms hide delay'
    );

    const willHide = triggerEvent('.tooltip', 'animationend');

    assert
      .dom('.tooltip')
      .exists('tooltip still present whilst hide animation is taking place');

    await willHide;

    assert.dom('.tooltip').doesNotExist('hidden after animation');
  });
});