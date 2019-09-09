import { module, test } from 'qunit';
import setupTooltipperTest from './setup';
import { render, settled } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { defer } from 'rsvp';

module('tooltipper', function(hooks) {
  setupTooltipperTest(hooks);

  test('loading data', async function(assert) {
    assert.expect(3);

    const deferred = defer();

    this.loadTooltip = () => deferred.promise;

    await render(hbs`
      <Tooltipper
        @showTooltip={{true}}
        @onLoad={{this.loadTooltip}}
        @tooltip={{component "foo-tooltip"}} />
    `);

    assert.dom('.tooltip').doesNotExist('not rendered tooltip yet');

    deferred.resolve({ name: 'World' });

    await settled();

    assert
      .dom('.tooltip')
      .exists(
        'renders the tooltip when the tooltipper has loaded the necessary data'
      );

    assert
      .dom('.tooltip')
      .hasText('Hello World', 'the loaded data is passed to the tooltip');
  });
});