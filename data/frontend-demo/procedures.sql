DELIMITER $$
CREATE TRIGGER prevent_blocked_flight BEFORE INSERT ON flights FOR EACH ROW
BEGIN
  IF (SELECT preflight_blocked FROM missions WHERE id=NEW.mission_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Cannot create a flight for a blocked preflight attempt';
  END IF;
END$$

CREATE PROCEDURE start_demo_run(IN p_seed INT UNSIGNED)
SQL SECURITY INVOKER
BEGIN
  DECLARE v_lock TINYINT;
  DECLARE v_choice INT;
  DECLARE v_arm INT;
  DECLARE v_component BIGINT UNSIGNED;
  DECLARE v_rule VARCHAR(60);
  DECLARE v_title VARCHAR(150);
  DECLARE v_message VARCHAR(500);
  DECLARE v_health VARCHAR(20);
  DECLARE v_severity VARCHAR(20);
  DECLARE v_metric VARCHAR(80);
  DECLARE v_value DECIMAL(10,3);
  DECLARE v_threshold DECIMAL(10,3);
  DECLARE v_unit VARCHAR(20);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  START TRANSACTION;
  SELECT id INTO v_lock FROM demo_runs WHERE id=1 FOR UPDATE;
  IF v_lock IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Demo run singleton is missing'; END IF;
  SET v_choice=IF(p_seed IS NULL,FLOOR(RAND()*3),MOD(p_seed,3));
  SET v_arm=IF(p_seed IS NULL,FLOOR(RAND()*4),MOD(FLOOR(p_seed/3),4));
  IF v_choice=0 THEN
    SET v_component=20+v_arm, v_rule='MOTOR_OVERHEAT', v_title='Motor temperature warning',
        v_health='WARNING', v_severity='WARNING', v_metric='motor_temperature_c',
        v_value=75, v_threshold=70, v_unit='C';
    SET v_message=CONCAT(ELT(v_arm+1,'Front-left','Front-right','Rear-left','Rear-right'),' motor reached 75 C before takeoff.');
  ELSEIF v_choice=1 THEN
    SET v_component=16+v_arm, v_rule='PROPELLER_DAMAGE_SUSPECTED', v_title='Propeller damage suspected',
        v_health='FAULT', v_severity='CRITICAL', v_metric='vibration_g',
        v_value=2.8, v_threshold=2.5, v_unit='g';
    SET v_message=CONCAT(ELT(v_arm+1,'Front-left','Front-right','Rear-left','Rear-right'),' propeller: 28% RPM imbalance and 2.8 g vibration.');
  ELSE
    SET v_component=26, v_rule='GPS_LOST', v_title='GPS signal lost',
        v_health='FAULT', v_severity='CRITICAL', v_metric='gps_quality',
        v_value=NULL, v_threshold=NULL, v_unit=NULL;
    SET v_message='GPS quality is LOST before takeoff; the mission is blocked.';
  END IF;
  DELETE FROM component_findings WHERE drone_id=2;
  UPDATE drone_components SET health_status='HEALTHY',updated_at='2026-10-28 02:00:00' WHERE drone_id=2;
  UPDATE drone_components SET health_status=v_health WHERE id=v_component AND drone_id=2;
  UPDATE demo_runs SET run_code=UUID(),selected_fault=v_rule,component_id=v_component,
      detected_at='2026-10-21 06:05:00',updated_at='2026-10-28 02:00:00' WHERE id=1;
  UPDATE alerts SET component_id=v_component,rule_code=v_rule,type=v_rule,severity=v_severity,
      title=v_title,message=v_message,metric_name=v_metric,observed_value=v_value,threshold_value=v_threshold,
      unit=v_unit,status='ACTIVE',resolved_at=NULL,resolution_note=NULL WHERE id=1 AND mission_id=2;
  INSERT INTO component_findings
    (id,finding_code,drone_id,mission_id,component_id,alert_id,run_id,severity,detected_at)
    VALUES(1,'FINDING-002',2,2,v_component,1,1,v_health,'2026-10-21 06:05:00');
  UPDATE missions SET status='WARNING',progress_percent=0 WHERE id=2;
  COMMIT;
END$$

CREATE PROCEDURE verify_frontend_demo()
SQL SECURITY INVOKER
BEGIN
  IF (SELECT build_id FROM data_pack_metadata WHERE id=1)<>'DRONE-DATA-2.1.0-R1-20261028' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Wrong data pack';
  END IF;
  IF (SELECT COUNT(*) FROM drones)<>5 OR (SELECT COUNT(*) FROM drone_components)<>70
      OR (SELECT COUNT(*) FROM missions WHERE is_current=1)<>5 OR (SELECT COUNT(*) FROM missions)<>7
      OR (SELECT COUNT(*) FROM waypoints)<>53 OR (SELECT COUNT(*) FROM flights)<>4
      OR (SELECT COUNT(*) FROM telemetry)<>25 OR (SELECT COUNT(*) FROM alerts)<>2
      OR (SELECT COUNT(*) FROM component_findings)<>1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Frontend demo record counts do not match';
  END IF;
  IF EXISTS(SELECT 1 FROM flights WHERE mission_id IN (2,5)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A blocked preflight attempt must not have a flight';
  END IF;
  IF EXISTS(SELECT 1 FROM missions WHERE is_current=1 AND status<>CASE id
      WHEN 1 THEN 'READY' WHEN 2 THEN 'WARNING' WHEN 3 THEN 'IN_PROGRESS'
      WHEN 4 THEN 'COMPLETED' WHEN 5 THEN 'FAILED' END) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Mission demonstration roles do not match';
  END IF;
  IF EXISTS(SELECT 1 FROM drones WHERE battery_percent<>100) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Current drone batteries must be 100 percent';
  END IF;
  IF (SELECT COUNT(*) FROM flights WHERE status='FLYING' AND drone_id=3 AND mission_id=3 AND route_progress_percent=43)<>1
     OR (SELECT COUNT(*) FROM drones WHERE status='IN_FLIGHT')<>1
     OR (SELECT status FROM drones WHERE id=3)<>'IN_FLIGHT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Active flight and drone state do not agree';
  END IF;
  IF (SELECT COUNT(*) FROM flights WHERE ended_at IS NOT NULL)<>3
     OR EXISTS(SELECT 1 FROM flights WHERE ended_at IS NOT NULL AND
       (TIMESTAMPDIFF(SECOND,started_at,ended_at)<>duration_sec OR route_progress_percent<>100)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Historical flight duration or progress is inconsistent';
  END IF;
  IF (SELECT COUNT(*) FROM component_findings f JOIN alerts a ON a.id=f.alert_id
      JOIN drone_components c ON c.id=f.component_id JOIN demo_runs r ON r.id=f.run_id
      WHERE f.drone_id=2 AND f.mission_id=2 AND a.mission_id=f.mission_id
       AND a.component_id=f.component_id AND c.drone_id=f.drone_id AND r.component_id=f.component_id
       AND r.selected_fault=a.rule_code AND c.health_status=f.severity AND a.flight_id IS NULL)<>1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Finding, alert and selected run fault disagree';
  END IF;
  IF (SELECT COUNT(*) FROM weather_checks WHERE mission_id=5 AND recommendation='UNSAFE'
      AND wind_speed_10m_mps>10 AND visibility_m<2000)<>1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Weather incident measurements do not support the failure';
  END IF;
  SELECT 'PASS' AS verification, 'DRONE-DATA-2.1.0-R1-20261028' AS build_id;
END$$
DELIMITER ;
