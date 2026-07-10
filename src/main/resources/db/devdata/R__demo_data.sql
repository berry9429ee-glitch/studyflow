INSERT IGNORE INTO users (id, username, email, password, avatar_color, role) VALUES
(1, 'admin', 'admin@studyflow.local', '$2b$12$ukVM9tJgPmFFe/U/8qCY5OymrrhtsTZ34HlBueKlkG0QX9zgUbw0a', '#5b7cf6', 'ADMIN'),
(2, 'demo', 'demo@studyflow.local', '$2b$12$wDIraFNPI3UXKY3PgGzo0OwYxaAy.D8sSxQBYM01dNNLqX810OHxK', '#14b8a6', 'USER');

INSERT IGNORE INTO plans (id, user_id, title, description, category, status, priority, due_date, progress) VALUES
(1, 2, 'Spring Security JWT 实战', '完成登录注册接口、JWT 过滤器和权限校验，最后整理一份复盘笔记。', 'Spring', 'IN_PROGRESS', 3, DATE_ADD(CURDATE(), INTERVAL 5 DAY), 50),
(2, 2, 'MySQL 索引复习', '整理 B+ 树、联合索引、覆盖索引和慢查询分析。', '数据库', 'TODO', 2, DATE_ADD(CURDATE(), INTERVAL 10 DAY), 0),
(3, 2, '算法每日练习', '二分、滑动窗口和动态规划各完成一组题。', '算法', 'IN_PROGRESS', 2, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 67),
(4, 2, 'Java 基础查漏补缺', '复习集合、并发基础和 JVM 内存模型。', 'Java基础', 'DONE', 1, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 100),
(5, 2, 'Redis 缓存设计', '梳理缓存穿透、击穿、雪崩治理方案，并画出接口缓存流程。', '数据库', 'TODO', 3, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 0);

INSERT IGNORE INTO plan_items (id, plan_id, content, is_done, sort_order) VALUES
(1, 1, '实现登录注册接口', true, 1),
(2, 1, '编写 JWT 过滤器', true, 2),
(3, 1, '完成接口权限测试', false, 3),
(4, 1, '整理安全配置笔记', false, 4),
(5, 2, '复习聚簇索引和二级索引', false, 1),
(6, 2, '画出联合索引最左前缀示意', false, 2),
(7, 2, '记录三条慢查询优化案例', false, 3),
(8, 3, '完成 5 道双指针题', true, 1),
(9, 3, '完成 3 道动态规划题', true, 2),
(10, 3, '复盘错题并写题解', false, 3),
(11, 4, '整理 HashMap 扩容流程', true, 1),
(12, 4, '复习线程池参数', true, 2),
(13, 4, '回顾类加载机制', true, 3),
(14, 5, '总结缓存穿透解决方案', false, 1),
(15, 5, '整理热点 Key 保护策略', false, 2);

INSERT IGNORE INTO plan_logs (id, plan_id, user_id, action, detail, created_at) VALUES
(1, 1, 2, 'CREATED', '创建计划：Spring Security JWT 实战', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 1, 2, 'ITEM_DONE', '完成任务：实现登录注册接口', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(3, 1, 2, 'ITEM_DONE', '完成任务：编写 JWT 过滤器', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 2, 2, 'CREATED', '创建计划：MySQL 索引复习', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(5, 3, 2, 'CREATED', '创建计划：算法每日练习', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(6, 3, 2, 'ITEM_DONE', '完成任务：完成 5 道双指针题', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(7, 3, 2, 'ITEM_DONE', '完成任务：完成 3 道动态规划题', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(8, 4, 2, 'CREATED', '创建计划：Java 基础查漏补缺', DATE_SUB(NOW(), INTERVAL 8 DAY)),
(9, 4, 2, 'STATUS_CHANGED_DONE', '计划已完成', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(10, 5, 2, 'CREATED', '创建计划：Redis 缓存设计', DATE_SUB(NOW(), INTERVAL 1 DAY));

INSERT IGNORE INTO notifications (id, user_id, plan_id, type, title, message, is_read, trigger_date) VALUES
(1, 2, 5, 'OVERDUE', '计划已逾期', '计划「Redis 缓存设计」已逾期 1 天，请及时调整或完成。', false, DATE_SUB(CURDATE(), INTERVAL 1 DAY)),
(2, 2, 3, 'DUE_SOON', '计划即将到期', '计划「算法每日练习」2 天后截止，建议优先处理。', false, DATE_ADD(CURDATE(), INTERVAL 2 DAY));
