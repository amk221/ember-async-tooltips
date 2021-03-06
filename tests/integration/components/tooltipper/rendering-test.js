import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { settled, render, click, triggerEvent } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { defer } from 'rsvp';

module('tooltipper', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.tooltipService = this.owner.lookup('service:tooltip');
  });

  test('rendering test', async function (assert) {
    assert.expect(1);

    await render(hbs`
      <Tooltipper
        @Tooltip={{component "tooltip"}}
        @mouseEvents={{false}} as |tooltipper|
      >
        <button type="button" {{on "click" tooltipper.showTooltip}}>
          Show
        </button>
      </Tooltipper>
    `);

    await click('button');
    await click('button');

    assert.equal(
      this.tooltipService.tooltippers.length,
      1,
      'correctly keeps track of tooltips'
    );
  });

  test('cancel destroying tooltip when animating out', async function (assert) {
    assert.expect(2);

    // This test simulates hovering over a tooltipper whilst a tooltip is
    // animating out. The tooltip should finish hiding and then show again,
    // and not be destroyed and rerendered.

    await render(hbs`
      <Tooltipper
        @showTooltip={{true}}
        @Tooltip={{component "tooltip"}}
      />
    `);

    const tooltipper = this.tooltipService.tooltippers[0];
    const willHideTooltip = tooltipper.actions.hideTooltip.call(tooltipper);

    triggerEvent('.tooltipper', 'mouseenter');

    await willHideTooltip;

    await settled();

    assert.dom('.tooltip').exists('tooltip is not destroyed');
    assert.dom('.tooltip').hasClass('tooltip--showing', 'is not hidden');
  });

  test('tearing down', async function (assert) {
    assert.expect(0);

    // This regression test checks that when a tooltipoer is destroyed,
    // that the tooltip service does not hold on to a reference
    // to its tooltip, which should also be destroyed.

    this.show = true;

    await render(hbs`
      {{#if this.show}}
        <Tooltipper
          class="tooltipper-1"
          @Tooltip={{component "tooltip"}}
        />
      {{/if}}

      <Tooltipper
        class="tooltipper-2"
        @Tooltip={{component "tooltip"}}
      />
    `);

    await triggerEvent('.tooltipper-1', 'mouseenter');

    this.set('show', false);

    await triggerEvent('.tooltipper-2', 'mouseenter');
  });

  test('tearing down whilst showing another tooltip', async function (assert) {
    assert.expect(0);

    // This tests loads a slow tooltipper, which is destroyed whilst
    // it is loading. During that time, another tooltipper is hovered over
    // This causes the code that checks if a tooltipper has-a-child,
    // or is-a-parent to run. The recently destroyed tooltipper's element
    // will be null so any parent/child checks need to account for this.

    this.show = true;

    const deferred = defer();

    this.loadTooltip = () => deferred.promise;

    await render(hbs`
      {{#if this.show}}
        <Tooltipper
          class="tooltipper-1"
          @Tooltip={{component "tooltip"}}
          @onLoad={{this.loadTooltip}}
        />
      {{/if}}

      <Tooltipper
        class="tooltipper-2"
        @Tooltip={{component "tooltip"}}
      />
    `);

    await triggerEvent('.tooltipper-1', 'mouseenter');

    this.set('show', false);

    await triggerEvent('.tooltipper-2', 'mouseenter');

    deferred.resolve();
  });
});
