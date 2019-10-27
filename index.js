const { resolve } = require('path');
const { remote: { BrowserWindow, BrowserView } } = require('electron');
const { React, getModule, constants: { MarketingURLs: { DEVELOPER_PORTAL } }, instance: { cache: moduleCache } } = require('powercord/webpack');
const { Plugin } = require('powercord/entities');
const { waitFor, getOwnerInstance } = require('powercord/util');
const { inject, uninject } = require('powercord/injector');

module.exports = class InAppDevPortal extends Plugin {
  constructor () {
    super();
    this.inDevPortal = false;
    this._navCallback = () => {
      this.closeDevPortal();
    };
    this._devtoolsCallback = () => {
      setTimeout(this._resizeView.bind(this), 150);
    };
  }

  get devPortalView () {
    if (!this._devPortalView) {
      const view = new BrowserView();
      view.setAutoResize({
        width: true,
        height: true
      });
      view.webContents.loadURL(`https:${DEVELOPER_PORTAL}`);
      this._devPortalView = view;
    }
    return this._devPortalView;
  }

  startPlugin () {
    this.loadCSS(resolve(__dirname, 'style.css'));
    this._injectDevPortal();
    const wc = BrowserWindow.getFocusedWindow().webContents;
    wc.on('page-title-updated', this._navCallback);
    wc.on('devtools-opened', this._devtoolsCallback);
    wc.on('devtools-closed', this._devtoolsCallback);
  }

  pluginWillUnload () {
    uninject('devportal-item');
    const wc = BrowserWindow.getFocusedWindow().webContents;
    wc.off('page-title-updated', this._navCallback);
    wc.off('devtools-opened', this._devtoolsCallback);
    wc.off('devtools-closed', this._devtoolsCallback);
    this.closeDevPortal();
    if (this._devPortalView) {
      this._devPortalView.destroy();
      delete this._devPortalView;
    }
  }

  async openDevPortal () {
    if (!this.inDevPortal) {
      const { selected } = await getModule([ 'selected', 'nameAndDecorators' ]);
      const element = document.querySelector(`.${selected.replace(/ /g, '.')}`);
      const callback = () => {
        element.removeEventListener('click', callback);
        this.closeDevPortal();
      };
      element.addEventListener('click', callback);
      document.body.classList.add('inapp-devportal');
      BrowserWindow.getFocusedWindow().addBrowserView(this.devPortalView);
      this._resizeView();
      this.inDevPortal = true;
    }
  }

  closeDevPortal () {
    if (this.inDevPortal) {
      document.body.classList.remove('inapp-devportal');
      BrowserWindow.getFocusedWindow().removeBrowserView(this.devPortalView);
      this.inDevPortal = false;
    }
  }

  async _injectDevPortal () {
    const PrivateChannel = Object.values(moduleCache).find(m => m.exports && m.exports.LinkButton).exports;
    const { privateChannels } = await getModule([ 'privateChannels' ]);
    const ownerInstance = getOwnerInstance(await waitFor(`.${privateChannels.replace(/ /g, '.')}`));
    const PrivateChannelsList = ownerInstance._reactInternalFiber.return.return.child.child.child.child.memoizedProps.children[1].type;
    inject('devportal-item', PrivateChannelsList.prototype, 'render', (_, res) => {
      res.props.children = [
        ...res.props.children.slice(0, 4),
        React.createElement(PrivateChannel.LinkButton, {
          className: 'developer-portal',
          iconName: 'OverlayOn',
          route: '/activity#test',
          text: 'Developer Portal',
          onClick: (e) => {
            e.preventDefault();
            document.title = 'Discord Developer Portal';
            setImmediate(() => this.openDevPortal());
          }
        }),
        res.props.children[4]
      ];
      return res;
    });
  }

  _resizeView () {
    if (this._devPortalView) {
      const { content } = getModule([ 'content', 'hiddenOnMobileStore' ], false);
      const { x, y, width, height } = document.querySelector(`.${content.replace(/ /g, '.')} > * + *`).getBoundingClientRect();
      this.devPortalView.setBounds({
        x,
        y,
        width,
        height
      });
    }
  }
};
