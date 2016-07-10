//=============================================================================
// Torigoya_ServiceWorkerCache.js
//=============================================================================

/*:
 * @plugindesc ServiceWorkerを使ったキャッシュの実験
 * @author ru_shalm

 * @param FileName
 * @desc ServiceWorkerに登録するJSファイル名
 * @default Torigoya_ServiceWorkerCache_Main.js

 * @param CachePrefix
 * @desc キャッシュにつけるユニークな文字列
 * @default TorigoyaCache

 * @param AutoUpdate
 * @desc デバッグプレイ時にキャッシュ情報を自動生成するか？
 * @default true
 */

(function (global) {
    'use strict';

    var ServiceWorkerCache = {
        name: 'Torigoya_ServiceWorkerCache'
    };
    ServiceWorkerCache.settings = (function () {
        var parameters = PluginManager.parameters(ServiceWorkerCache.name);
        return {
            swFileName: String(parameters['FileName'] || 'Torigoya_ServiceWorkerCache_Main.js'),
            cachePrefix: String(parameters['CachePrefix'] || 'TorigoyaCache'),
            autoUpdate: (String(parameters['AutoUpdate'] || 'true') !== 'false')
        };
    })();

    //-----------------------------------------------------------------------------
    var rootPath = window.location.pathname.replace(/(\/www|)\/[^\/]*$/, '');

    ServiceWorkerCache.canUse = function () {
        return (!StorageManager.isLocalMode() && 'serviceWorker' in navigator);
    };

    ServiceWorkerCache.install = function () {
        if (this.canUse()) {
            return navigator.serviceWorker.register(
                rootPath + '/' + ServiceWorkerCache.settings.swFileName,
                {scope: rootPath + '/'}
            ).then(function (_result) {
                return true;
            }).catch(function (e) {
                console.error(e);
                alert('ダウンロード機能の有効化に失敗しました。');
                return false;
            });
        } else {
            alert('ご利用の環境はダウンロード機能に非対応です。');
        }
    };

    ServiceWorkerCache.uninstall = function () {
        if (this.canUse()) {
            navigator.serviceWorker.getRegistrations().then(function (registrations) {
                registrations.forEach(function (registration) {
                    if (registration.active && ~registration.active.scriptURL.indexOf(ServiceWorkerCache.settings.swFileName)) {
                        registration.unregister();
                    }
                });
            });
        }
    };

    var upstream_Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (command, args) {
        if (command === 'EnableCache' || command === '一括DL有効化') {
            ServiceWorkerCache.install();
            return true;
        } else if (command === 'DisableCache' || command === '一括DL無効化') {
            ServiceWorkerCache.uninstall();
            return true;
        }
        return upstream_Game_Interpreter_pluginCommand.apply(this, arguments);
    };

    //-----------------------------------------------------------------------------
    // for debug mode

    if (StorageManager.isLocalMode() && Utils.isOptionValid('test') && ServiceWorkerCache.settings.autoUpdate) {
        var fs = require('fs');
        var path = require('path');
        var crypto = require('crypto');

        var directories = [
            '/audio',
            '/data',
            '/fonts',
            '/icon',
            '/img',
            '/js',
            '/movies'
        ];

        var ignoreFile = /^(\..+)$/;

        var generateHash = function (filePath) {
            var md5hash = crypto.createHash('md5');
            md5hash.update(fs.readFileSync(filePath), 'binary');
            return md5hash.digest('hex');
        };

        var readPath = function (root) {
            return Array.prototype.concat.apply([], fs.readdirSync(root).filter(function (file) {
                return !file.match(ignoreFile);
            }).map(function (file) {
                return path.join(root, file);
            }).map(function (file) {
                var stat = fs.statSync(file);
                if (stat.isDirectory()) {
                    return readPath(file);
                } else {
                    return {
                        path: file.replace(new RegExp('^' + rootPath), ''),
                        md5: generateHash(file)
                    };
                }
            }));
        };

        var updateCacheJson = function () {
            var list = Array.prototype.concat.apply([], directories.map(function (dir) {
                return readPath(rootPath + dir);
            }));
            list.push({
                path: '/',
                md5: generateHash(rootPath + '/index.html')
            });
            fs.writeFileSync(rootPath + '/cache.json', JSON.stringify(list));
        };

        var updateWorkerScript = function () {
            var swFilePath = rootPath + '/' + ServiceWorkerCache.settings.swFileName;
            var n = fs.readFileSync(swFilePath, {encoding: 'utf-8'});
            n = n.replace(/var\sCACHE_NAME\s=.+/, 'var CACHE_NAME = "' + ServiceWorkerCache.settings.cachePrefix + '-' + (new Date()).getTime() + '";');
            fs.writeFileSync(swFilePath, n);
        };

        var upstream_Scene_Boot_initialize = Scene_Boot.prototype.initialize;
        Scene_Boot.prototype.initialize = function () {
            upstream_Scene_Boot_initialize.apply(this);
            updateCacheJson();
            updateWorkerScript();
            console.info('[Torigoya_ServiceWorkerCache] updated cache.json.');
        };
    }

    // -------------------------------------------------------------------------
    global.Torigoya = (global.Torigoya || {});
    global.Torigoya.ServiceWorkerCache = ServiceWorkerCache;
})(this);
