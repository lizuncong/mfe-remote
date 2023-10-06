## 目的

用于研究 webpack5 模块联邦特性及源码。

本仓库主要是暴露远程模块，供其他子应用消费。

## 说明

开发环境有太多干扰代码，为了方便阅读打包后的代码，需要修改 webpack 配置，mode 固定为'development'，然后关闭压缩 optimization.minimize = false

然后运行 yarn run build 打包代码

