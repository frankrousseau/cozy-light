
var fs = require('fs');
var npm = require('npm');
var pathExtra = require('path-extra');
var request = require('request-json-light');

module.exports = function(cozyLight){

  var nodeHelpers = cozyLight.nodeHelpers;
  var LOGGER = cozyLight.logger;
  var configHelpers = cozyLight.configHelpers;

  var npmHelpers = {

    /**
     * initial working directory of the spawner
     */
    initialWd: '',

    /**
     * Fetch given app source and dependencies from NPM registry.
     *
     * Config file is ~/.cozy-light/.config
     *
     * @param {String} app App to fetch from NPM.
     * @param {Function} callback Callback to run once work is done.
     */
    install: function (app, callback) {
      var options = {
        dir: configHelpers.getModulesPath(),
        prefix: ''
      };
      npm.load(options, function () {
        npm.commands.install([app], callback);
      });
    },

    /**
     * Link given app source and dependencies from local file system.
     *
     * @param {String} app Path to the module to link.
     * @param {Function} callback Callback to run once work is done.
     */
    link: function (app, callback) {
      var options = {
        local: true,
        dir: configHelpers.getModulesPath(),
        prefix: ''
      };
      npm.load(options, function () {
        app = pathExtra.resolve(npmHelpers.initialWd, app);
        npm.commands.link([app], callback);
      });
    },

    /**
     * Remove application source and dependencies using NPM lib.
     *
     * @param {String} app App to fetch from NPM.
     * @param {Function} callback Callback to run once work is done.
     */
    uninstall: function (app, callback) {
      var options = {
        dir: configHelpers.getModulesPath(),
        prefix: ''
      };
      npm.load(options, function () {
        npm.commands.uninstall([app], callback);
      });
    },

    /**
     * Fetch application or plugin manifest from an url or a path
     *
     * @param {String} app App or Plugin name to fetch from url or path.
     * @param {Function} callback Termination.
     */
    fetchManifest: function (app, callback) {
      var appPath = pathExtra.resolve(npmHelpers.initialWd, app);

      var manifestPath = pathExtra.join(appPath, 'package.json');
      if (fs.existsSync(appPath) && fs.existsSync(manifestPath)) {
        fs.readFile(manifestPath, function checkError (err, manifest) {
          if (err) {
            LOGGER.error(err);
            nodeHelpers.invoke(callback, err);
          } else {
            nodeHelpers.invoke(callback, err, JSON.parse(manifest), 'file');
          }
        });
      } else {
        var client = request.newClient( 'https://raw.githubusercontent.com/');
        var manifestUrl = app + '/master/package.json';

        client.get(manifestUrl, function (err, res, manifest) {
          if (err) {
            LOGGER.error(err);
            nodeHelpers.invoke(callback, err);
          } else if (res.statusCode !== 200) {
            LOGGER.error(err);
            nodeHelpers.invoke(callback, err);
          } else {
            nodeHelpers.invoke(callback, err, manifest, 'url');
          }
        });
      }
    },

    /**
     * Fetch and install application or plugin from an url or a path
     *
     * @param {String} app App or Plugin name to fetch from url or path.
     * @param {Function} callback Termination.
     * TODO rename this function
     */
    fetchInstall: function (app, callback) {
      npmHelpers.fetchManifest(app, function(fetchErr, manifest, type){
        if (fetchErr) {
          return nodeHelpers.invoke(callback, fetchErr);
        }
        var cb = function (err) {
          nodeHelpers.invoke(callback, err, manifest, type);
        };
        if (type === 'file') {
          npmHelpers.link(app, cb);
        } else {
          npmHelpers.install(app, cb);
        }
      });
    }
  };

  return npmHelpers;
};