# StudyFlow 项目说明

## 项目标题

StudyFlow 学习计划管理系统 | Spring Boot / MySQL / Redis / JWT / Docker

## 项目概述

基于 Spring Boot 3.2、Spring Security、JWT、MyBatis-Plus、MySQL、Redis 和原生 HTML/CSS/JavaScript 实现的学习计划管理系统，支持用户认证、计划管理、任务清单、进度统计、活动日志、站内到期提醒和 Docker Compose 一键部署。

## 核心实现

- 设计并实现用户注册登录、JWT 无状态鉴权和 BCrypt 密码加密，使用 Spring Security 过滤器解析 Bearer Token，保护计划、任务、通知等核心接口。
- 基于 MyBatis-Plus 与 MySQL 设计 users、plans、plan_items、plan_logs、notifications 等业务表，实现计划分页检索、分类/状态筛选、任务进度自动计算和活动日志记录。
- 引入 Redis 缓存仪表盘统计数据，针对计划和任务变更主动失效用户维度缓存，降低高频统计接口对数据库的重复查询压力。
- 实现站内提醒中心，通过 `@Scheduled` 定时扫描即将到期和已逾期计划，并通过唯一业务键保证通知生成幂等，支持未读统计、标记已读和手动扫描演示。
- 编写 Dockerfile 与 Docker Compose 编排 Spring Boot、MySQL、Redis 环境，补充提醒扫描单元测试和 README 运行文档，提高项目可演示性和交付完整度。

## 技术说明

StudyFlow 的目标不是停留在简单 CRUD，而是把认证、数据权限、统计缓存、定时提醒和部署演示串成一个完整闭环。后端使用 Spring Boot 3.2、Spring Security、JWT、MyBatis-Plus、MySQL 和 Redis，前端用原生 HTML/CSS/JavaScript 实现仪表盘、计划列表、详情页和提醒中心。项目中比较能体现工程完整性的部分主要有三块：第一是 JWT 登录和用户数据隔离，计划、任务、通知都只能访问当前用户的数据；第二是仪表盘统计使用 Redis 缓存，并在计划或任务变更后清理缓存；第三是提醒模块通过定时任务扫描到期计划，并用唯一键保证重复扫描不会生成重复通知。

## GitHub 仓库简介

StudyFlow is a Spring Boot learning-plan management system with JWT authentication, MySQL persistence, Redis dashboard caching, scheduled due-date reminders, and a static responsive frontend.

## 技术问题参考

- JWT 认证过滤器如何从请求中恢复当前登录用户？
- 如何保证用户 A 不能访问用户 B 的计划和通知？
- Redis 缓存 key 如何设计？什么时候删除缓存？
- 定时提醒如何避免重复生成？
- Docker Compose 中应用服务如何连接 MySQL 和 Redis？
- 如果用户量增加，仪表盘统计和提醒扫描还可以怎么优化？
