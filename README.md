## 目的

用于研究 webpack5 模块联邦特性及源码。

本仓库主要是暴露远程模块，供其他子应用消费。

## 说明

开发环境有太多干扰代码，为了方便阅读打包后的代码，需要修改 webpack 配置，mode 固定为'development'，然后关闭压缩 optimization.minimize = false

然后运行 yarn run build 打包代码

## 实践

### shared 共享依赖

默认情况下，在 shared 里面配置的依赖都会单独打包成一个独立的文件。以下面的配置为例

主应用 webpack 配置：

```js
output: {
  //...
  publicPath: '/', // publicPath会影响子应用加载远程脚本
  //...
}
//...
new ModuleFederationPlugin({
  name: "containerApp",
  filename: "remoteEntry.js",
  exposes: {
    "./Components": "./src/components/Button",
  },
  shared: {
    react: {
      singleton: true,
    },
    "react-dom": {
      singleton: true,
    },
  },
});
```

子应用配置：

```js
new ModuleFederationPlugin({
  remotes: {
    container: "containerApp@http://localhost:8081/remoteEntry.js",
  },
  shared: {
    react: {
      singleton: true,
    },
    "react-dom": {
      singleton: true,
    },
    axios: {},
    "js-cookie": {},
  },
});
```

主应用打包后的产物如下：

![image](./imgs/shared_01.jpg)

可以看到，react、react-dom 都被打包成单独的 chunk 文件 node_modules_react_index_js 以及 vendors-node_modules_react-dom_index_js。同时，exposes 里面的 Components 也被打包成独立的 chunk 文件 src_components_Button_index_js

子应用打包后的产物如下：

![image](./imgs/shared_02.jpg)

可以看到 react、react-dom、axios、js-cookie 分别被打包成独立的 chunk 文件 node_modules_react_index_js、vendors-node_modules_react-dom_index_js、vendors-node_modules_axios_index_js、node_modules_js-cookie_dist_js_cookie_mjs

打开浏览器，查看主应用控制台网络请求，如下：

![image](./imgs/shared_03.jpg)

可以发现主应用也请求了 remoteEntry 文件，实际上主应用在打包时，会默认把 remoteEntry 打包到 index.html 文件里面。即使删除这个请求，也不会影响主应用的运行。

再看看子应用控制台网络请求，如下：

![image](./imgs/shared_04.jpg)

上面请求 404 的脚本实际上都是子应用请求的主应用的脚本，这些请求都是在 remoteEntry.js 脚本中发起的。但是由于主应用的 publicPath 没有设置正确，导致这些请求都代理到了自应用，子应用没有这些脚本，请求肯定都是 404。我们暂且不管 404 的请求。思考另一个问题：我们在子应用的shared配置里面配置了四个共享依赖react、react-dom、axios、js-cookie。为啥react、react-dom请求出错，而js-cookie、axios的请求却正常？

要回答这个问题，我们需要先来看下子应用的main文件请求

![image](./imgs/shared_05.jpg)

在子应用的main文件中，会首先注册4个共享依赖，然后调用initExternal加载主应用的remoteEntry.js，并调用主应用的init方法。remoteEntry.js的init逻辑如下：

![image](./imgs/shared_06.jpg)

可以看到，init方法中的sharedScope是子应用的main.js传递过来的参数，也是我们在子应用webpack配置里面定义的shared依赖，其结构如上图所示。这里需要特别注意每个依赖都有一个get方法，这个get方法默认都是在main.js中定义的。同时在init方法中，还通过__webpack_require__.S[name] = shareScope将子应用的共享依赖挂在remoteEntry的__webpack_require__上。

![image](./imgs/shared_07.jpg)

从上面的流程可以看出：子应用配置的shared依赖，会通过register注册到sharedScope里面，每个sharedScope里面的依赖都有一个get方法。默认情况下，这些get方法都是走的子应用的main.js的get方法，请求的是子应用打包后的chunk文件。但是，子应用请求主应用的remoteEntry后，remoteEntry.js注册的是主应用的shared依赖，同时remoteEntry.js的register方法注册的是主应用的依赖，会覆盖掉子应用shareScope依赖里面的get方法，retemoEntry.js的get方法请求的是主应用打包后的chunk文件。由于主应用只定义了react、react-dom这两个依赖，因此这两个依赖请求的是主应用的。而js-cookie、axios只有子应用定义了，因此请求的是子应用的。

>具体的register、get方法加载模块的流程可以看源码。


### 待整理

- 如果 shared 设置为 eager，则会将依赖打包进入口串里面
- 添加进 shared 里面的依赖，都会打包成单独的一个 chunk 文件
- Shared 引用。
