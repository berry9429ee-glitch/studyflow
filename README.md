# StudyFlow 学习计划管理系统

StudyFlow 是一个面向个人学习目标管理的全栈练习项目，覆盖登录认证、计划管理、任务清单、仪表盘统计、站内提醒、缓存优化、接口文档、单元测试和 Docker Compose 部署。项目可作为 Java 后端或全栈开发实践案例。

## 项目截图

| 桌面端仪表盘 | 移动端适配 |
| --- | --- |
| ![StudyFlow desktop dashboard](docs/screenshots/dashboard-desktop.png) | ![StudyFlow mobile dashboard](docs/screenshots/dashboard-mobile.png) |

## 技术栈

- 后端：Spring Boot 3.2、Spring Security 6、JWT jjwt 0.12、MyBatis-Plus 3.5、MySQL 8.0、Redis、Lettuce、Maven
- 前端：HTML5、CSS3、Vanilla JavaScript、Lucide Icons、Chart.js
- 文档与工具：knife4j、Swagger OpenAPI、Lombok、MapStruct、JUnit 5、Docker Compose

## 核心功能

- 用户注册、登录、BCrypt 密码加密、JWT 无状态认证
- 计划分页查询、关键词搜索、分类筛选、状态筛选
- 新建、编辑、删除计划，手动更新计划状态
- 任务清单新增、删除、切换完成状态、排序
- 计划进度自动计算，任务完成后同步更新计划状态
- 活动日志记录计划创建、更新、任务变更等关键操作
- 仪表盘统计总计划、待开始、进行中、已完成、逾期、完成率、本周完成和分类分布
- Redis 缓存仪表盘数据，计划或任务变更后自动清理用户维度缓存
- 站内提醒中心定时扫描即将到期和已逾期计划，支持未读统计、标记已读和手动扫描
- 纯静态响应式前端页面：登录、注册、概览、计划列表、计划详情、计划表单、提醒中心
- Docker Compose 编排 MySQL、Redis 和后端服务，支持本地快速演示

## 快速启动

### 方式一：Docker Compose

本机已安装 Docker 时，可以直接启动完整环境：

```bash
docker compose up --build
```

启动后访问：

```text
http://localhost:8080
```

如需清空数据库并重新导入初始化数据：

```bash
docker compose down -v
docker compose up --build
```

### 方式二：本地运行

前置环境：

- JDK 17+
- Maven 3.8+
- MySQL 8.0
- Redis 6+

创建数据库：

```sql
CREATE DATABASE studyflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

导入初始化脚本：

```bash
mysql -u root -p studyflow < src/main/resources/sql/init.sql
```

复制环境变量示例并按本机环境修改：

```bash
cp .env.example .env
```

也可以直接修改 `src/main/resources/application.yml` 中的本地数据库配置。

`.env.example` 中的密码和 JWT secret 仅用于本地演示，真实部署时请改为自己的环境变量。

启动服务：

```bash
mvn spring-boot:run
```

访问前端：

```text
http://localhost:8080
```

## 演示账号

- 管理员：`admin` / `admin123`
- 普通用户：`demo` / `user123`

## 接口文档

- knife4j：`http://localhost:8080/doc.html`
- OpenAPI JSON：`http://localhost:8080/v3/api-docs`

## 提醒接口

- `GET /api/notifications`：查询当前用户提醒，可用 `read=true/false` 过滤
- `GET /api/notifications/unread-count`：查询未读提醒数
- `PATCH /api/notifications/{id}/read`：标记单条提醒已读
- `PATCH /api/notifications/read-all`：标记全部提醒已读
- `POST /api/notifications/scan`：手动扫描当前用户到期计划，便于演示和调试

## 测试

```bash
mvn test
```

当前已补充提醒扫描单元测试，覆盖逾期计划和即将到期计划两类提醒生成逻辑。

## 项目结构

```text
src/main/java/com/studyflow
├── config        # 安全、Redis、MyBatis-Plus、Swagger 配置
├── controller    # REST API 控制器
├── dto           # 请求、响应和 MapStruct 映射对象
├── entity        # MySQL 实体对象
├── exception     # 统一异常处理
├── mapper        # MyBatis-Plus Mapper
├── security      # JWT、过滤器、登录用户模型
├── service       # 业务服务
└── util          # 当前登录用户工具

src/main/resources
├── mapper        # MyBatis XML
├── sql           # 初始化 SQL
└── static        # 原生前端页面、CSS、JavaScript
```

## 技术亮点

- JWT 无状态认证：前端携带 Bearer Token，后端过滤器解析用户身份。
- 数据权限：计划、任务、通知都按当前登录用户隔离，避免越权访问。
- Redis 缓存：仪表盘统计缓存 5 分钟，计划或任务变更后删除对应用户缓存。
- 定时任务：`@Scheduled` 扫描未完成且接近截止日期的计划，并通过唯一业务键保证提醒幂等。
- 工程部署：通过 Docker Compose 编排应用、MySQL 和 Redis，减少环境不一致问题。
- 测试补充：提醒扫描单元测试覆盖逾期和即将到期两类业务分支。

更多项目说明可查看 [docs/project-summary.md](docs/project-summary.md)。
