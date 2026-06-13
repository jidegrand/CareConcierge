# Phase 2: Emergency Code Alert System

## Overview

Real-time emergency code management with switchboard coordination, staff response tracking, and compliance audit trails. Extends Care Concierge architecture to handle hospital-wide emergency broadcasts.

**Status**: Roadmap (Post-Care Concierge stabilization)  
**Complexity**: Medium-High  
**Est. Development**: 6-8 weeks  

---

## Problem Statement

Hospitals currently lack a unified, trackable emergency response system:
- Overhead paging broadcasts codes but provides no response tracking
- Paper logs create compliance gaps
- No visibility into response times or staff arrival
- Post-incident analysis relies on manual data collection
- No integration between alert generation and staff response

**Solution**: Unified switchboard system that tracks entire code lifecycle (triggered → announced → responded → resolved).

---

## Core Workflow

```
1. ALERT TRIGGERED
   └─ Clinical event (fall sensor, monitor alert, panic button, staff call)
   └─ System routes to Switchboard Queue

2. OPERATOR REVIEWS
   └─ Switchboard operator receives alert
   └─ Reviews code type, location, details
   └─ Approves announcement

3. ANNOUNCEMENT
   └─ Operator triggers overhead announcement
   └─ "Code Blue, ICU Room 12" broadcast
   └─ App notifications to nearby staff
   └─ SMS alerts to on-call staff

4. STAFF RESPONDS
   └─ Staff mark "Responding" in app
   └─ System tracks location + ETA
   └─ Staff mark "Arrived" when on-site
   └─ Bay Map shows responder locations in real-time

5. RESOLUTION
   └─ Operator marks code resolved
   └─ System captures resolution time
   └─ Optional: Post-incident procedures triggered
   └─ Audit trail finalized
```

---

## Key Features

### Switchboard Dashboard
- **Alert queue** - Incoming codes with priority (Critical, High, Medium, Low)
- **Quick actions** - Approve announcement, cancel, escalate
- **Announcement history** - Log of all broadcasts with timestamps
- **Active codes** - Real-time view of ongoing codes with responder count
- **Response analytics** - Current code response times, staff en route

### Code Configuration
- **Code library** - Hospital-specific code definitions (Code Blue, Code Pink, Code Red, etc.)
- **Code procedures** - Checklists/procedures pushed to responders
- **Response requirements** - Which staff roles must respond (RN, MD, Respiratory, etc.)
- **Escalation rules** - Auto-escalate if no response in X seconds

### Responder Interface
- **Alert notifications** - Push, SMS, app banner based on staff location
- **Quick actions** - "Responding" / "Arrived" / "Not responding" buttons
- **Code procedure card** - One-tap access to code-specific procedures
- **Real-time updates** - See other responders, code status, updates
- **Bay Map integration** - Show responder locations during active code

### Analytics & Compliance
- **Response time metrics** - Time from alert → announcement → first responder arrival
- **Code patterns** - Which codes occur most, time of day trends
- **Responder performance** - Individual/team response times
- **Compliance reports** - Joint Commission audit trails, incident documentation
- **Post-event review** - Timeline replay, responder analysis

---

## Architecture

### Database Schema

```sql
-- Code types and definitions
CREATE TABLE code_types (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  code_name VARCHAR (e.g., "Code Blue", "Code Pink"),
  code_color VARCHAR,
  description TEXT,
  response_roles TEXT[] (which roles must respond),
  procedures JSONB (checklists/procedures),
  escalation_seconds INT (auto-escalate if no response),
  created_at TIMESTAMP
);

-- Alert sources (sensors, monitors, staff calls)
CREATE TABLE alert_sources (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  source_type VARCHAR (sensor, monitor, panic_button, staff_call),
  device_id VARCHAR,
  location TEXT,
  created_at TIMESTAMP
);

-- Active code alerts
CREATE TABLE code_alerts (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  code_type_id UUID REFERENCES code_types(id),
  alert_source_id UUID REFERENCES alert_sources(id),
  triggered_at TIMESTAMP,
  announced_at TIMESTAMP,
  announced_by UUID REFERENCES auth.users(id), -- switchboard operator
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES auth.users(id),
  location VARCHAR,
  details JSONB,
  status VARCHAR (triggered, announced, active, resolved),
  created_at TIMESTAMP
);

-- Staff responses to codes
CREATE TABLE code_responses (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  code_alert_id UUID REFERENCES code_alerts(id),
  staff_id UUID REFERENCES auth.users(id),
  notification_sent_at TIMESTAMP,
  responded_at TIMESTAMP, -- when staff marked "responding"
  arrived_at TIMESTAMP, -- when staff marked "arrived"
  location_lat FLOAT,
  location_lon FLOAT,
  eta_seconds INT,
  role VARCHAR,
  created_at TIMESTAMP
);

-- Audit trail
CREATE TABLE code_audit_log (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  code_alert_id UUID REFERENCES code_alerts(id),
  action VARCHAR (triggered, announced, escalated, responded, arrived, resolved),
  actor_id UUID REFERENCES auth.users(id),
  actor_role VARCHAR,
  timestamp TIMESTAMP,
  metadata JSONB
);
```

### RLS Policies
- Operators can view all codes at their facility
- Staff can view only codes they've been notified about
- Audit logs are read-only for compliance
- Tenant isolation enforced at code level

---

## Frontend Components

### Pages/Routes
- `/switchboard` - Operator dashboard (role: switchboard_operator)
- `/codes/active` - Staff view of active codes
- `/codes/history` - Incident review and analytics

### Switchboard Components
- `SwitchboardDashboard.tsx` - Main operator interface
- `AlertQueue.tsx` - Incoming codes queue
- `AnnouncementModal.tsx` - Announcement confirmation + broadcast
- `ActiveCodesPanel.tsx` - Real-time code status
- `CodeHistory.tsx` - Past codes with audit trail

### Staff Components
- `CodeAlert.tsx` - Full-screen alert notification
- `CodeProcedureCard.tsx` - Expandable procedure/checklist
- `ResponseTracker.tsx` - Show responders, their location, status
- `CodeStatusBar.tsx` - Header showing active code status

### Shared Components
- `CodeBadge.tsx` - Code type badge (Code Blue, Code Pink, etc.)
- `ResponseMetrics.tsx` - Time metrics (alert → announcement → arrival)
- `CodeTimeline.tsx` - Incident timeline with all events

### Hooks
- `useCodeAlert()` - Subscribe to code alerts
- `useCodeResponse()` - Track response status (responding, arrived, etc.)
- `useCodeMetrics()` - Calculate response times and analytics

---

## Integration Points

### With Existing Care Concierge
- **Bay Map**: Show responder locations during codes (extend existing map)
- **Staff Dashboard**: "Active Code" indicator, quick navigation to code details
- **Request Queue**: Different queue for codes (higher priority, different workflow)
- **Activity Feed**: Code events logged in staff activity
- **Notifications**: Reuse notification system (push, SMS, email)

### External Systems (Future)
- **EHR Integration**: Auto-trigger codes from monitor alerts
- **Overhead Paging**: API to trigger announcement in hospital speaker system
- **GPS/Wearables**: Track staff location for response routing
- **Call Button System**: Integrate existing hospital call systems as alert source

---

## Phased Rollout

### Phase 2.1: Core Switchboard (Weeks 1-3)
- [ ] Database schema and RLS policies
- [ ] Switchboard dashboard (operator view)
- [ ] Manual code entry + announcement workflow
- [ ] Response tracking (staff mark responding/arrived)
- [ ] Basic metrics (response times)

### Phase 2.2: Staff Notifications (Weeks 4-5)
- [ ] Code alerts sent to responders
- [ ] In-app and push notifications
- [ ] Code procedure cards
- [ ] Quick response buttons
- [ ] Location tracking during codes

### Phase 2.3: Analytics & Compliance (Weeks 6-8)
- [ ] Audit trail and incident review
- [ ] Response time analytics
- [ ] Compliance reports (Joint Commission format)
- [ ] Post-incident analysis page
- [ ] Historical data exports

---

## Success Metrics

- Response time reduced by 30% (from alert to first responder arrival)
- 100% incident documentation (vs. paper-based gaps)
- Staff notification delivery >99% (no missed alerts)
- Operator workflow < 5 seconds (alert to announcement)
- Compliance audit pass (zero missing audit trails)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Alert fatigue (too many notifications) | Staff ignore alerts | Smart filtering by proximity/role, tunable escalation |
| Location data privacy | HIPAA concerns | Only track location during active code, encrypt in transit, audit access |
| System failure during code | Patient safety risk | Fallback to overhead paging, offline queue, failover replication |
| False alerts clogging system | Operator overwhelmed | Alert validation, confirmation step before broadcast, duplicate suppression |

---

## Future Enhancements (Phase 3+)

- **Automated alert generation** - Monitor integration (cardiac, fall sensors)
- **Predictive routing** - ML-based staff assignment (closest responder, availability)
- **Simulation/drills** - Test codes without real incidents
- **Communication channel** - Unified chat during active code
- **Wearable integration** - Smartwatch alerts for staff
- **Post-incident debriefs** - Structured review with AI-generated transcripts
- **Mobile app** - Native iOS/Android for notifications
- **Integration marketplace** - Third-party EHR/alert system connectors

---

## Dependencies

- Existing Care Concierge database + RLS framework
- Real-time notification system (already built)
- Location/geolocation capabilities
- Audio/speaker system API (future)
- Staff availability/scheduling data

---

## Estimated Effort

| Component | Hours |
|-----------|-------|
| Database schema + RLS | 20 |
| Switchboard dashboard | 40 |
| Staff notifications | 30 |
| Response tracking | 25 |
| Analytics page | 35 |
| Testing + edge cases | 40 |
| Documentation | 20 |
| **Total** | **210 hours (~6 weeks)** |

---

## Success Criteria for Launch

✅ Switchboard operator can create and announce codes in <10 seconds  
✅ Staff receive notifications and can respond within app  
✅ Response times tracked from alert to arrival  
✅ Full audit trail for compliance  
✅ Zero missed alerts in 24-hour stress test  
✅ Fallback to manual paging if system fails  
✅ HIPAA compliance verified  

---

## Questions for Stakeholder Review

1. Should codes integrate with existing EHR/monitor systems or start manual?
2. Which code types are priority? (Code Blue, Code Pink, Code Red, etc.)
3. Should codes automatically escalate if no response in X seconds?
4. Post-incident workflows: What data needs to be captured?
5. Compliance/audit: What formats required for Joint Commission?

---

**Owner**: Jide Grand  
**Last Updated**: 2026-05-31  
**Status**: Roadmap - Ready for Phase 2 planning
