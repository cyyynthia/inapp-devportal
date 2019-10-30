const { React, getModule, constants: { MarketingURLs: { DEVELOPER_PORTAL } }, instance: { cache: moduleCache } } = require('powercord/webpack');
const { Plugin } = require('powercord/entities');
const { waitFor, getOwnerInstance } = require('powercord/util');
const { inject, uninject } = require('powercord/injector');

module.exports = class InAppDevPortal extends Plugin {
  startPlugin () {
    this._injectDevPortal();
    this.registerRoute('/inapp-devportal', () => React.createElement('iframe', {
      src: DEVELOPER_PORTAL,
      style: {
        width: '100%',
        height: '100%'
      }
    }));
  }

  pluginWillUnload () {
    uninject('devportal-item');
  }

  async _injectDevPortal () {
    const PrivateChannel = Object.values(moduleCache).find(m => m.exports && m.exports.LinkButton).exports;
    const { privateChannels } = await getModule([ 'privateChannels' ]);
    const ownerInstance = getOwnerInstance(await waitFor(`.${privateChannels.replace(/ /g, '.')}`));
    const PrivateChannelsList = ownerInstance._reactInternalFiber.return.return.child.child.child.child.memoizedProps.children[1].type;
    inject('devportal-item', PrivateChannelsList.prototype, 'render', (_, res) => {
      const selected = window.location.pathname === '/_powercord/inapp-devportal';
      const index = res.props.children.map(c => c && c.type && c.type.displayName && c.type.displayName.includes('FriendsButtonInner')).indexOf(true) + 1;
      if (selected) {
        res.props.children.forEach(c => {
          c.props.selected = false;
        });
      }
      res.props.children = [
        ...res.props.children.slice(0, index),
        React.createElement(PrivateChannel.LinkButton, {
          iconName: 'OverlayOn',
          route: '/_powercord/inapp-devportal',
          text: 'Developer Portal',
          selected
        }),
        res.props.children.slice(index)
      ];
      return res;
    });
  }
};
