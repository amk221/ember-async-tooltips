# ember-async-tooltips

<a href="http://emberobserver.com/addons/ember-async-tooltips"><img src="http://emberobserver.com/badges/ember-async-tooltips.svg"></a> &nbsp; <a href="https://david-dm.org/amk221/ember-async-tooltips#badge-embed"><img src="https://david-dm.org/amk221/ember-async-tooltips.svg"></a> &nbsp; <a href="https://david-dm.org/amk221/ember-async-tooltips#dev-badge-embed"><img src="https://david-dm.org/amk221/ember-async-tooltips/dev-status.svg"></a> &nbsp; <a href="https://codeclimate.com/github/amk221/ember-async-tooltips"><img src="https://codeclimate.com/github/amk221/ember-async-tooltips/badges/gpa.svg" /></a> &nbsp; <a href="http://travis-ci.org/amk221/ember-async-tooltips"><img src="https://travis-ci.org/amk221/ember-async-tooltips.svg?branch=master"></a>

### Installation
```
ember install ember-async-tooltips
```

### Demo

Demo coming soon, for now checkout and build the dummy application.

<img src="docs/screenshot.png" width"512" height="319">

### Features
* Manual positioning either: N, NE, E, SE, S, SW, W, NW
* Automatic positioning: Viewport is split into rows and columns which help determine where a tooltip is positioned
* Will show after a the specified hover delay
* Can wait before showing, whilst async data is loaded and passed to them
* The hover delay is subtracted from the time it takes to load the async data

### Recommended usage

It is recommended that you don't use `tool-tip` and `tool-tipper` components directly, but instead extend them to create your own.

For example, the following configuration creates a new tooltip that:
* Has custom automatic positioning: NW, N, NE, SE, S, SW.
  Excludes W and E - useful if you don't want to add CSS for these positions.
* Has a custom hover delay (won't display the user tooltip until after 300ms has passed)
* Loads the user _during_ the alotted hover delay time period, or extending the delay if it wasn't retreived in time


```javascript
// tool-tipper/user.js
import ToolTipperComponent from 'ember-async-tooltips/components/tool-tipper';

export default ToolTipperComponent.extend({
  classNames: ['user-tooltipper'],
  hoverDelay: 300
});
```

```javascript
// tool-tip/user.js
import ToolTipComponent from 'ember-async-tooltips/components/tool-tip';

export default ToolTipComponent.extend({
  classNames: ['user-tooltip'],

  placementBoundary($container) {
    return this._super($container, 3, 2);
  }
});
```

```handlebars
  {{! application.hbs }}
  {{#tool-tipper/user on-load=(action 'loadUser' user.id) tooltip=(component 'tool-tip/user')}}
    {{user.name}}
  {{/tool-tipper/user}}
```

```handlebars
  {{! tool-tip/user.hbs }}
  Hello {{data.user.name}}
```


### Prerequisites

1. It is assumed that all your tooltips will animate in and out. For this reason
  you are required to add the following styles:

  ```css
  .your-tooltip.is-showing {
    animation: your-show-animation;
  }

  .your-tooltip.is-hiding {
    animation: your-hide-animation;
  }
  ```

2. In order to detect when a tooltip has animated out your application must be
   informed of animation events. Add the following to `app/app.js`

  ```javascript
  customEvents: {
    webkitAnimationEnd: 'animationEnd',
    msAnimationEnd: 'animationEnd',
    oAnimationEnd: 'animationEnd',
    animationend: 'animationEnd'
  }
  ```

### Manual positioning

Setting the `placement` attribute will add `left` and `right` CSS properties based upon the compass points. This will position the `tool-tip` around the outside edge of the `tool-tipper` component that caused it to display.

```handlebars
  {{tool-tipper/example tooltip=(component 'tool-tip/example' placement='NW')}}
```

### Automatic positioning

The tooltip will be positioned around the outside edge of the `tool-tipper` component that caused it display by chosing the most appropriate compass point. For example: If the `tool-tipper` component is at the very bottom of the viewport, then the `tool-tip` component will be displayed _above_ the `tool-tipper` - so as to remain visible in the viewport, rather than going below the fold.

```handlebars
  {{tool-tipper/example tooltip=(component 'tool-tip/example')}}
```
