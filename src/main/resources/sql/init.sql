DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS plan_logs;
DROP TABLE IF EXISTS plan_items;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  username     VARCHAR(50) NOT NULL UNIQUE,
  email        VARCHAR(100) UNIQUE,
  password     VARCHAR(255) NOT NULL,
  avatar_color VARCHAR(7) DEFAULT '#5b7cf6',
  role         ENUM('USER','ADMIN') DEFAULT 'USER',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE plans (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id      BIGINT NOT NULL,
  title        VARCHAR(100) NOT NULL,
  description  TEXT,
  category     VARCHAR(50),
  status       ENUM('TODO','IN_PROGRESS','DONE') DEFAULT 'TODO',
  priority     TINYINT DEFAULT 2,
  due_date     DATE,
  progress     INT DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE plan_items (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  plan_id      BIGINT NOT NULL,
  content      VARCHAR(200) NOT NULL,
  is_done      BOOLEAN DEFAULT false,
  sort_order   INT DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE TABLE plan_logs (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  plan_id      BIGINT NOT NULL,
  user_id      BIGINT NOT NULL,
  action       VARCHAR(50),
  detail       VARCHAR(255),
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_plan_logs_plan_id (plan_id),
  INDEX idx_plan_logs_user_created (user_id, created_at)
);

CREATE TABLE notifications (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id      BIGINT NOT NULL,
  plan_id      BIGINT,
  type         VARCHAR(40) NOT NULL,
  title        VARCHAR(100) NOT NULL,
  message      VARCHAR(255) NOT NULL,
  is_read      BOOLEAN DEFAULT false,
  trigger_date DATE,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at      DATETIME,
  UNIQUE KEY uk_notifications_plan_type_trigger (plan_id, type, trigger_date),
  INDEX idx_notifications_user_read_created (user_id, is_read, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

INSERT INTO users (id, username, email, password, avatar_color, role) VALUES
(1, 'admin', 'admin@studyflow.local', '$2b$12$ukVM9tJgPmFFe/U/8qCY5OymrrhtsTZ34HlBueKlkG0QX9zgUbw0a', '#5b7cf6', 'ADMIN'),
(2, 'demo', 'demo@studyflow.local', '$2b$12$wDIraFNPI3UXKY3PgGzo0OwYxaAy.D8sSxQBYM01dNNLqX810OHxK', '#14b8a6', 'USER');

INSERT INTO plans (id, user_id, title, description, category, status, priority, due_date, progress) VALUES
(1, 2, 'Spring Security JWT 实战', '完成认证授权、JWT过滤器和权限边界梳理。', 'Spring', 'IN_PROGRESS', 3, DATE_ADD(CURDATE(), INTERVAL 5 DAY), 50),
(2, 2, 'MySQL 索引复习', '整理B+树、联合索引、覆盖索引和慢查询分析。', '数据库', 'TODO', 2, DATE_ADD(CURDATE(), INTERVAL 10 DAY), 0),
(3, 2, '算法每日练习', '保持题感，重点复盘动态规划和双指针。', '算法', 'IN_PROGRESS', 2, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 67),
(4, 2, 'Java 基础查漏补缺', '复习集合、并发基础和JVM内存模型。', 'Java基础', 'DONE', 1, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 100),
(5, 2, 'Redis 缓存设计', '完成缓存穿透、击穿、雪崩的对比笔记。', '数据库', 'TODO', 3, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 0);

INSERT INTO plan_items (plan_id, content, is_done, sort_order) VALUES
(1, '实现登录注册接口', true, 1),
(1, '编写JWT过滤器', true, 2),
(1, '完成接口权限测试', false, 3),
(1, '整理安全配置笔记', false, 4),
(2, '复习聚簇索引和二级索引', false, 1),
(2, '画出联合索引最左前缀示意', false, 2),
(2, '记录三条慢查询优化案例', false, 3),
(3, '完成5道双指针题', true, 1),
(3, '完成3道动态规划题', true, 2),
(3, '复盘错题并写题解', false, 3),
(4, '整理HashMap扩容流程', true, 1),
(4, '复习线程池参数', true, 2),
(4, '回顾类加载机制', true, 3),
(5, '总结缓存穿透解决方案', false, 1),
(5, '整理热点Key保护策略', false, 2);

INSERT INTO plan_logs (plan_id, user_id, action, detail, created_at) VALUES
(1, 2, 'CREATED', '创建计划：Spring Security JWT 实战', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(1, 2, 'ITEM_DONE', '完成任务：实现登录注册接口', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(1, 2, 'ITEM_DONE', '完成任务：编写JWT过滤器', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(2, 2, 'CREATED', '创建计划：MySQL 索引复习', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(3, 2, 'CREATED', '创建计划：算法每日练习', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(3, 2, 'ITEM_DONE', '完成任务：完成5道双指针题', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(3, 2, 'ITEM_DONE', '完成任务：完成3道动态规划题', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(4, 2, 'CREATED', '创建计划：Java 基础查漏补缺', DATE_SUB(NOW(), INTERVAL 8 DAY)),
(4, 2, 'STATUS_CHANGED_DONE', '计划已完成', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(5, 2, 'CREATED', '创建计划：Redis 缓存设计', DATE_SUB(NOW(), INTERVAL 1 DAY));

INSERT INTO notifications (user_id, plan_id, type, title, message, is_read, trigger_date) VALUES
(2, 5, 'OVERDUE', '计划已逾期', '计划「Redis 缓存设计」已逾期 1 天，请及时调整或完成。', false, DATE_SUB(CURDATE(), INTERVAL 1 DAY)),
(2, 3, 'DUE_SOON', '计划即将到期', '计划「算法每日练习」2 天后截止，建议优先处理。', false, DATE_ADD(CURDATE(), INTERVAL 2 DAY));
