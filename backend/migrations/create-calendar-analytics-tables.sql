-- Calendar Events Table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'SALES_CALL',
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  attendee_name VARCHAR(255),
  attendee_email VARCHAR(255),
  attendee_phone VARCHAR(50),
  attendee_company VARCHAR(255),
  meeting_link VARCHAR(500),
  timezone VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
  assigned_to_user_id UUID,
  metadata JSONB,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calendar_events_tenant_id ON calendar_events(tenant_id);
CREATE INDEX idx_calendar_events_assigned_to_user_id ON calendar_events(assigned_to_user_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_status ON calendar_events(status);

-- Web Analytics Table
CREATE TABLE IF NOT EXISTS web_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL DEFAULT 'PAGE_VIEW',
  path VARCHAR(500),
  referrer VARCHAR(500),
  user_agent TEXT,
  ip_address VARCHAR(50),
  country VARCHAR(100),
  city VARCHAR(100),
  device VARCHAR(100),
  browser VARCHAR(100),
  os VARCHAR(100),
  metadata JSONB,
  session_id VARCHAR(255),
  user_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_web_analytics_tenant_id ON web_analytics(tenant_id);
CREATE INDEX idx_web_analytics_created_at ON web_analytics(created_at);
CREATE INDEX idx_web_analytics_event_type ON web_analytics(event_type);
CREATE INDEX idx_web_analytics_path ON web_analytics(path);
CREATE INDEX idx_web_analytics_session_id ON web_analytics(session_id);

-- Tenant Activities Table
CREATE TABLE IF NOT EXISTS tenant_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL,
  user_id UUID,
  resource_id UUID,
  resource_type VARCHAR(100),
  metadata JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_activities_tenant_id ON tenant_activities(tenant_id);
CREATE INDEX idx_tenant_activities_created_at ON tenant_activities(created_at);
CREATE INDEX idx_tenant_activities_activity_type ON tenant_activities(activity_type);
CREATE INDEX idx_tenant_activities_user_id ON tenant_activities(user_id);

