CREATE TABLE IF NOT EXISTS users (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  username     VARCHAR(50) NOT NULL UNIQUE,
  email        VARCHAR(100) UNIQUE,
  password     VARCHAR(255) NOT NULL,
  avatar_color VARCHAR(7) DEFAULT '#5b7cf6',
  role         ENUM('USER','ADMIN') DEFAULT 'USER',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plans (
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
  CONSTRAINT fk_plans_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS plan_items (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  plan_id      BIGINT NOT NULL,
  content      VARCHAR(200) NOT NULL,
  is_done      BOOLEAN DEFAULT false,
  sort_order   INT DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_plan_items_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plan_logs (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  plan_id      BIGINT NOT NULL,
  user_id      BIGINT NOT NULL,
  action       VARCHAR(50),
  detail       VARCHAR(255),
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_plan_logs_plan_id (plan_id),
  INDEX idx_plan_logs_user_created (user_id, created_at)
);

CREATE TABLE IF NOT EXISTS notifications (
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
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_notifications_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);
