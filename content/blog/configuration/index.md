---
title: "Website Configuration"
date: 2025-02-09
draft: true
summary: "This is my hugo website configuration"
---

## 准备条件

- 一个域名
- 一个云服务器
- 一个hugo站点

## 技术选型

网站内容生产：选择了由go语言编写的hugo框架，hugo可以快速构建出静态网站，并且支持多种主题和插件，可以满足大部分需求。

自动化构建流程：使用github actions来实现自动化构建，github actions可以实现代码的自动化构建、测试和部署，并且支持多种语言和框架。

公网部署方案：使用阿里云服务器，通过域名解析将域名指向服务器，然后通过nginx反向代理将请求转发到hugo站点。





