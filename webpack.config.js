const defaultsDeep = require('lodash.defaultsdeep');
const path = require('path');
const webpack = require('webpack');

// Plugins
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// PostCss
const autoprefixer = require('autoprefixer');
const postcssVars = require('postcss-simple-vars');
const postcssImport = require('postcss-import');

const STATIC_PATH = process.env.STATIC_PATH || '/static';
const {APP_NAME} = require('./src/lib/constants/brand');

const root = process.env.ROOT || '';
if (root.length > 0 && !root.endsWith('/')) {
    throw new Error('If ROOT is defined, it must have a trailing slash.');
}

const htmlWebpackPluginCommon = {
    root: root,
    meta: JSON.parse(process.env.EXTRA_META || '{}'),
    APP_NAME
};

// When this changes, the path for all JS files will change, bypassing any HTTP caches
const CACHE_EPOCH = 'gleba4';

const base = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devtool: process.env.SOURCEMAP || (process.env.NODE_ENV === 'production' ? false : 'cheap-module-source-map'),
    devServer: {
        contentBase: path.resolve(__dirname, 'build'),
        host: '0.0.0.0',
        disableHostCheck: true,
        compress: true,
        port: process.env.PORT || 8601,
        // 减少 WDS 断连机率
        sockPath: '/__ws',
        // allows ROUTING_STYLE=wildcard to work properly
        historyApiFallback: {
            rewrites: [
                {from: /^\/\d+\/?$/, to: '/index.html'},
                {from: /^\/\d+\/fullscreen\/?$/, to: '/fullscreen.html'},
                {from: /^\/\d+\/editor\/?$/, to: '/editor.html'},
                {from: /^\/\d+\/embed\/?$/, to: '/embed.html'},
                {from: /^\/addons\/?$/, to: '/addons.html'}
            ]
        }
    },
    output: {
        library: 'GUI',
        filename: process.env.NODE_ENV === 'production' ?
            `js/${CACHE_EPOCH}/[name].[contenthash].js` : 'js/[name].js',
        chunkFilename: process.env.NODE_ENV === 'production' ?
            `js/${CACHE_EPOCH}/[name].[contenthash].js` : 'js/[name].js',
        publicPath: root
    },
    resolve: {
        symlinks: false,
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        alias: {
            'react': require.resolve('react'),
            'react-dom': require.resolve('react-dom'),
            'text-encoding$': path.resolve(__dirname, 'src/lib/tw-text-encoder'),
            'scratch-render-fonts$': path.resolve(__dirname, 'src/lib/tw-scratch-render-fonts'),
            'exports-loader': require.resolve('exports-loader'),
            'components': path.resolve(__dirname, 'src/components/ai/gandi/components'),
            'utils': path.resolve(__dirname, 'src/utils'),
            'html2canvas': path.resolve(__dirname, 'src/lib/html2canvas-stub.js'),
            'just-bash$': path.resolve(__dirname, 'node_modules/just-bash/dist/bundle/browser.js'),
            'node:zlib$': path.resolve(__dirname, 'src/lib/just-bash-zlib.js'),
            // just-bash bundles an ESM-only minimatch@10 that webpack 4 cannot parse.
            // Pin it to the hoisted CJS minimatch@3 (already used by glob/babel/eslint),
            // whose API is a superset of what just-bash needs (minimatch()).
            'minimatch': require.resolve('minimatch'),
            '@remixwarp/scratch-l10n': path.resolve(__dirname, 'node_modules/@remixwarp/scratch-l10n'),
            // 直接 alias 到 fork 包的源码入口（与 cyso 项目一致）。
            // 这些 fork 从 git 分发、不含预构建 dist，webpack 4 无法解析其 main；
            // babel-loader 的 include 规则已覆盖 scratch-*/src，源码入口可被直接编译。
            'scratch-blocks$': path.resolve(__dirname, 'node_modules/@remixwarp/scratch-blocks/shim/vertical.js'),
            'scratch-render$': path.resolve(__dirname, 'node_modules/scratch-render/src/index.js'),
            'scratch-audio$': path.resolve(__dirname, 'node_modules/scratch-audio/src/index.js'),
            'scratch-paint$': path.resolve(__dirname, 'node_modules/scratch-paint/src/index.js')
        }
    },
    node: {
        __dirname: false,
        __filename: false
    },
    module: {
        // peerjs bundles its own parcel module system; webpack's static analysis
        // trips over its dynamic require() and emits a "Critical dependency" warning.
        noParse: /node_modules[\\/]peerjs[\\/]dist[\\/]peerjs\.min\.js/,
        rules: [{
            // accounts-sdk ships esbuild/tsc output that uses TS class-field syntax
            // (e.g. `status;` / `data;` inside class bodies), which webpack 4's own
            // parser cannot handle. Force it through babel with class-properties support.
            test: /node_modules[\\/]accounts-sdk[\\/].*\.(js|mjs)$/,
            loader: 'babel-loader',
            options: {
                babelrc: false,
                plugins: [require.resolve('@babel/plugin-proposal-class-properties')],
                presets: [
                    ['@babel/preset-env', {
                        targets: {esmodules: true}
                    }]
                ]
            }
        }, {
            test: /\.(jsx?|tsx?|mjs)$/,
            loader: 'babel-loader',
            include: [
                path.resolve(__dirname, 'src'),
                /node_modules[\\/]scratch-[^\\/]+[\\/]src/,
                /node_modules[\\/]pify/,
                /node_modules[\\/]@vernier[\\/]godirect/,
                /node_modules[\\/]domelementtype/,
                /node_modules[\\/]domutils/,
                /node_modules[\\/]react-markdown/,
                /node_modules[\\/]isomorphic-git/,
                /node_modules[\\/]fractch/,
                /node_modules[\\/]just-bash/,
                /node_modules[\\/]monaco-editor/,
                /node_modules[\\/]rotur-sdk/,
                /node_modules[\\/]accounts-sdk/,
                /node_modules[\\/]@remixwarp[\\/]scratch-l10n/
            ],
            exclude: [
                /\.(vert|frag|glsl|ttf|woff2?|eot|png|jpe?g|gif|svg)$/,
                /node_modules[\\/]scratch-render[\\/]src[\\/]shaders/
            ],
            options: {
                cacheDirectory: true,
                // Explicitly disable babelrc so we don't catch various config
                // in much lower dependencies.
                babelrc: false,
                plugins: [
                    '@babel/plugin-transform-class-static-block',
                    ['react-intl', {
                        messagesDir: './translations/messages/'
                    }]
                ],
                presets: [
                    ['@babel/preset-env', {
                        bugfixes: true,
                        browserslistEnv: 'production'
                    }],
                    '@babel/preset-react',
                    '@babel/preset-typescript'
                ]
            }
        },
        {
            test: /\.css$/,
            use: [{
                loader: 'style-loader'
            }, {
                loader: 'css-loader',
                options: {
                    modules: true,
                    importLoaders: 1,
                    localIdentName: '[name]_[local]_[hash:base64:5]',
                    camelCase: true
                }
            }, {
                loader: 'postcss-loader',
                options: {
                    ident: 'postcss',
                    plugins: function () {
                        return [
                            postcssImport,
                            postcssVars,
                            autoprefixer
                        ];
                    }
                }
            }]
        },
        {
            test: /\.less$/,
            use: [{
                loader: 'style-loader'
            }, {
                loader: 'css-loader',
                options: {
                    modules: true,
                    importLoaders: 2,
                    localIdentName: '[name]_[local]_[hash:base64:5]',
                    camelCase: true
                }
            }, {
                loader: 'postcss-loader',
                options: {
                    ident: 'postcss',
                    plugins: function () {
                        return [
                            postcssImport,
                            postcssVars,
                            autoprefixer
                        ];
                    }
                }
            }, {
                loader: 'less-loader'
            }]
        },
        {
            test: /\.hex$/,
            use: [{
                loader: 'url-loader',
                options: {
                    limit: 16 * 1024
                }
            }]
        },
        {
            test: /\.raw\.(js|jsx|json|md)$/,
            use: 'raw-loader'
        },
        {
            test: /\.(glsl|vert|frag)$/,
            use: 'raw-loader'
        },
        {
            test: /\.json$/,
            type: 'json'
        }, {
            // Fonts: inline as data URLs if small enough (<200KB) to avoid CORS/SPA fallback issues
            // in dev server. Woff2 fonts are typically 10-100KB each, so inlining all 7 fonts
            // adds less than 0.5MB to the bundle but guarantees they load reliably.
            // If any font exceeds this limit, file-loader outputs it to static/assets/ as a fallback.
            test: /\.(ttf|eot|woff2?)$/,
            loader: 'url-loader',
            options: {
                limit: 200 * 1024,
                name: 'static/assets/[name].[hash:8].[ext]',
                esModule: false
            }
        }]
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'node_modules/@remixwarp/scratch-blocks/media',
                    to: 'static/blocks-media/default'
                },
                {
                    from: 'node_modules/@remixwarp/scratch-blocks/media',
                    to: 'static/blocks-media/high-contrast'
                },
                {
                    from: 'src/lib/themes/blocks/high-contrast-media/blocks-media',
                    to: 'static/blocks-media/high-contrast',
                    force: true
                },
                {
                    from: 'src/addons/addons-l10n',
                    to: 'addons-l10n'
                }
            ]
        })
    ],
    externals: {
        'electron': 'commonjs electron'
    }
}

if (!process.env.CI) {
    base.plugins.push(new webpack.ProgressPlugin());
}

module.exports = [
    // to run editor examples
    defaultsDeep({}, base, {
        entry: {
            'editor': './src/playground/editor.jsx',
            'player': './src/playground/player.jsx',
            'fullscreen': './src/playground/fullscreen.jsx',
            'embed': './src/playground/embed.jsx',
            'addon-settings': './src/playground/addon-settings.jsx',
            'credits': './src/playground/credits/credits.jsx'
        },
        output: {
            path: path.resolve(__dirname, 'build')
        },
        module: {
            rules: base.module.rules.concat([
                {
                    // Note: woff2?/ttf/eot fonts are already handled by base rule with
                    // larger inline limit (200KB) above, so do not re-include them here.
                    test: /\.(svg|png|wav|mp3|gif|jpg)$/,
                    loader: 'url-loader',
                    options: {
                        limit: 2048,
                        outputPath: 'static/assets/',
                        esModule: false
                    }
                }
            ])
        },
        optimization: {
            splitChunks: {
                chunks: 'all',
                minChunks: 2,
                minSize: 50000,
                maxInitialRequests: 5,
                cacheGroups: {
                    vendors: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'initial',
                        priority: -10
                    },
                    common: {
                        name: 'common',
                        minChunks: 2,
                        chunks: 'all',
                        priority: -20,
                        reuseExistingChunk: true
                    },
                    // Monaco editor and xterm are heavy dependencies that are
                    // only used in specific panels (git modal, terminal, JSON
                    // editor). Split them out so they don't inflate the shared
                    // vendors chunk and are only downloaded when needed.
                    monacoEditor: {
                        test: /node_modules[\\/]monaco-editor[\\/]/,
                        name: 'monaco-editor',
                        priority: 20,
                        reuseExistingChunk: true
                    },
                    xterm: {
                        test: /node_modules[\\/](?:@xterm|xterm)[\\/]/,
                        name: 'xterm',
                        priority: 20,
                        reuseExistingChunk: true
                    }
                }
            },
            runtimeChunk: 'single',
            minimize: process.env.NODE_ENV === 'production',
            minimizer: process.env.NODE_ENV === 'production' ? [
                new (require('terser-webpack-plugin').default || require('terser-webpack-plugin'))({
                    terserOptions: {
                        compress: {
                            drop_console: true,
                            drop_debugger: true,
                            dead_code: true,
                            unused: true,
                            if_return: true,
                            join_vars: true
                        },
                        output: {
                            comments: false,
                            beautify: false
                        }
                    }
                })
            ] : []
        },
        plugins: base.plugins.concat([
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': `"${process.env.NODE_ENV}"`,
                'process.env.DEBUG': Boolean(process.env.DEBUG),
                'process.env.ENABLE_SERVICE_WORKER': JSON.stringify(process.env.ENABLE_SERVICE_WORKER || ''),
                'process.env.ROOT': JSON.stringify(root),
                'process.env.ROUTING_STYLE': JSON.stringify(process.env.ROUTING_STYLE || 'filehash'),
                'process.env.MW_COMMUNITY': JSON.stringify(process.env.MW_COMMUNITY || ''),
                'react-dom.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.DO_NOT_USE_THIS_YET': true
            }),
            new HtmlWebpackPlugin({
                chunks: ['editor'],
                template: 'src/playground/index.ejs',
                filename: 'editor.html',
                title: `${APP_NAME}-Editor`,
                description: `Create, edit, and share projects with ${APP_NAME}'s powerful Scratch editor. Build games, animations, and interactive stories with advanced features and optimizations.`,
                isEditor: true,
                ...htmlWebpackPluginCommon
            }),
            new HtmlWebpackPlugin({
                chunks: ['player'],
                template: 'src/playground/index.ejs',
                filename: 'index.html',
                title: `${APP_NAME} - Refactoring freedom`,
                ...htmlWebpackPluginCommon
            }),
            new HtmlWebpackPlugin({
                chunks: ['fullscreen'],
                template: 'src/playground/index.ejs',
                filename: 'fullscreen.html',
                title: `${APP_NAME} - Refactoring freedom`,
                ...htmlWebpackPluginCommon
            }),
            new HtmlWebpackPlugin({
                chunks: ['embed'],
                template: 'src/playground/embed.ejs',
                filename: 'embed.html',
                title: `Embedded Project - ${APP_NAME}`,
                ...htmlWebpackPluginCommon
            }),
            new HtmlWebpackPlugin({
                chunks: ['addon-settings'],
                template: 'src/playground/simple.ejs',
                filename: 'addons.html',
                title: `Addon Settings - ${APP_NAME}`,
                ...htmlWebpackPluginCommon
            }),
            new HtmlWebpackPlugin({
                chunks: ['credits'],
                template: 'src/playground/simple.ejs',
                filename: 'credits.html',
                title: `${APP_NAME} Credits`,
                ...htmlWebpackPluginCommon
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: 'static',
                        to: ''
                    }
                ]
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: 'extensions/**',
                        to: 'static',
                        context: 'src/examples'
                    }
                ]
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: 'asset',
                        to: 'asset',
                        noErrorOnMissing: true
                    }
                ]
            })
        ])
    })
].concat(
    process.env.NODE_ENV === 'production' || process.env.BUILD_MODE === 'dist' ? (
        // export as library
        defaultsDeep({}, base, {
            target: 'web',
            entry: {
                'scratch-gui': './src/index.js'
            },
            output: {
                libraryTarget: 'umd',
                filename: 'js/[name].js',
                chunkFilename: 'js/[name].js',
                path: path.resolve('dist'),
                publicPath: `${STATIC_PATH}/`
            },
            externals: {
                'react': 'react',
                'react-dom': 'react-dom'
            },
            module: {
                rules: base.module.rules.concat([
                    {
                        // Note: woff2?/ttf/eot fonts are already handled by base rule with
                        // larger inline limit (200KB) above, so do not re-include them here.
                        test: /\.(svg|png|wav|mp3|gif|jpg)$/,
                        loader: 'url-loader',
                        options: {
                            limit: 2048,
                            outputPath: 'static/assets/',
                            publicPath: `${STATIC_PATH}/assets/`,
                            esModule: false
                        }
                    }
                ])
            },
            plugins: base.plugins.concat([
                new CopyWebpackPlugin({
                    patterns: [
                        {
                            from: 'extension-worker.{js,js.map}',
                            context: 'node_modules/scratch-vm/dist/web',
                            noErrorOnMissing: true
                        }
                    ]
                }),
                // Include library JSON files for scratch-desktop to use for downloading
                new CopyWebpackPlugin({
                    patterns: [
                        {
                            from: 'src/lib/libraries/*.json',
                            to: 'libraries',
                            flatten: true
                        }
                    ]
                }),
                // Copy local assets for library loading
                new CopyWebpackPlugin({
                    patterns: [
                        {
                            from: 'asset',
                            to: 'asset',
                            noErrorOnMissing: true
                        }
                    ]
                })
            ])
        })) : []
);
