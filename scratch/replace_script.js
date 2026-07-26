const fs = require('fs');
const path = require('path');

const targetFilePath = 'c:/Users/lck90/OneDrive/바탕 화면/브래드보드/script.js';
const content = fs.readFileSync(targetFilePath, 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);
console.log('Line 1739 (1-indexed, index 1738):', lines[1738]);
console.log('Line 2363 (1-indexed, index 2362):', lines[2362]);

if (!lines[1738].includes('function drawLed') || lines[2362].trim() !== '}') {
  console.error('Line alignment mismatch! Verification failed.');
  process.exit(1);
}

const replacementCode = `  function drawLed(comp, isSelected) {
    const c1 = getHoleCoords(comp.anode.col, comp.anode.row);   // (+) 아노드
    const c2 = getHoleCoords(comp.cathode.col, comp.cathode.row); // (-) 캐소드

    const midX = (c1.x + c2.x) / 2;
    const midY = (c1.y + c2.y) / 2;

    const angle = Math.atan2(c2.y - c1.y, c2.x - c1.x);

    ctx.save();
    
    // 1. 금속 리드 다리
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    
    // 다리가 휘지 않고 구멍 방향과 완벽히 일치하도록 벡터 방향으로 직선 렌더링
    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;
    const dist = Math.hypot(dx, dy);
    const ux = dist > 0 ? dx / dist : 0;
    const uy = dist > 0 ? dy / dist : 0;

    ctx.beginPath();
    ctx.moveTo(c1.x, c1.y);
    ctx.lineTo(midX - 3 * ux, midY - 3 * uy);
    ctx.moveTo(c2.x, c2.y);
    ctx.lineTo(midX + 3 * ux, midY + 3 * uy);
    ctx.stroke();

    // (+)와 (-) 극성 표시 그리기 (구멍 바깥쪽에 표시하여 시인성 확보)
    ctx.save();
    ctx.font = '700 14px Outfit';
    ctx.fillStyle = '#ef4444'; // (+) 아노드는 빨간색
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const nx = -uy;
    const ny = ux;
    
    const labelPos1 = {
      x: c1.x - nx * 15,
      y: c1.y - ny * 15
    };
    ctx.fillText('+', labelPos1.x, labelPos1.y);

    ctx.fillStyle = '#3b82f6'; // (-) 캐소드는 파란색
    const labelPos2 = {
      x: c2.x - nx * 15,
      y: c2.y - ny * 15
    };
    ctx.fillText('-', labelPos2.x, labelPos2.y);
    ctx.restore();

    // 2. LED 구형 플라스틱 캡슐
    ctx.translate(midX, midY);
    ctx.rotate(angle);

    const isLit = circuitAnalysis.litLeds.has(comp.id);
    const isBurnt = circuitAnalysis.burntLeds.has(comp.id);

    // 컬러 매핑
    let ledBaseColor = '#ff2d55'; // red
    let glowColor = 'rgba(255, 45, 85, 0.6)';
    if (comp.color === 'green') {
      ledBaseColor = '#34c759';
      glowColor = 'rgba(52, 199, 89, 0.6)';
    } else if (comp.color === 'blue') {
      ledBaseColor = '#007aff';
      glowColor = 'rgba(0, 122, 255, 0.6)';
    }

    if (isSelected) {
      ctx.shadowColor = 'rgba(37, 99, 235, 0.8)';
      ctx.shadowBlur = 10;
    }

    if (isBurnt) {
      // 3-1. 타버린 LED (진한 회색에 깨진 금 무늬)
      ctx.fillStyle = '#4b5563';
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -5, 14, Math.PI, 0); // 돔
      ctx.lineTo(14, 5); // 하단 베이스
      ctx.lineTo(-14, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 깨진 금 표현
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(2, 0);
      ctx.lineTo(-2, 4);
      ctx.stroke();

      // 연기/스파크 애니메이션 연출 (isPlaying 활성 시)
      if (Math.sin(Date.now() / 100) > 0) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.beginPath();
        ctx.arc(-8, -18, 2, 0, Math.PI*2);
        ctx.arc(8, -12, 1.5, 0, Math.PI*2);
        ctx.fill();
      }
    } else if (isLit) {
      // 3-2. 점등된 LED (글로우 효과 가득한 컬러 그라디언트)
      const grad = ctx.createRadialGradient(0, -6, 2, 0, -6, 16);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, ledBaseColor);
      grad.addColorStop(1, '#7f1d1d');
      
      ctx.shadowColor = ledBaseColor;
      ctx.shadowBlur = 20 + Math.sin(Date.now() / 120) * 8; // 빛이 일렁이는 느낌
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, -5, 14, Math.PI, 0);
      ctx.lineTo(14, 5);
      ctx.lineTo(-14, 5);
      ctx.closePath();
      ctx.fill();

      // 내부 반사 구조물
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(-6, -2, 12, 3);
    } else {
      // 3-3. 소등된 LED (투명한 젤리 재질 느낌)
      ctx.fillStyle = ledBaseColor + '44'; // 알파 반투명
      ctx.strokeStyle = ledBaseColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -5, 14, Math.PI, 0);
      ctx.lineTo(14, 5);
      ctx.lineTo(-14, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 비점등 금속 심벌
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-4, -1, 8, 4);
    }

    ctx.restore();
  }

  function drawSwitch(comp, isSelected) {
    const c1 = getHoleCoords(comp.pin1.col, comp.pin1.row);
    const c2 = getHoleCoords(comp.pin2.col, comp.pin2.row);
    const midX = (c1.x + c2.x) / 2;
    const midY = (c1.y + c2.y) / 2;

    const angle = Math.atan2(c2.y - c1.y, c2.x - c1.x);
    const len = Math.hypot(c2.x - c1.x, c2.y - c1.y);

    ctx.save();
    ctx.translate(midX, midY);
    ctx.rotate(angle);

    if (isSelected) {
      ctx.shadowColor = 'rgba(37, 99, 235, 0.7)';
      ctx.shadowBlur = 10;
    }

    // 1. 금속 단자 다리선
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-len/2, 0);
    ctx.lineTo(len/2, 0);
    ctx.stroke();

    // 2. 스위치 외부 케이스 하우징
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, -22, -12, 44, 24, 4, true, true);

    // 3. 레버 가이드 슬라이더 레일
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-14, -4, 28, 8);

    // 4. 슬라이더 노브 (상태에 따라 위치 변경)
    const knobX = comp.state === 'on' ? 8 : -8;
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0; // 그림자 해제
    
    // 레버 그리기
    drawRoundedRect(ctx, knobX - 6, -9, 12, 18, 2, true, true);

    // 노브 줄무늬 홈
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(knobX - 3, -4); ctx.lineTo(knobX - 3, 4);
    ctx.moveTo(knobX, -4); ctx.lineTo(knobX, 4);
    ctx.moveTo(knobX + 3, -4); ctx.lineTo(knobX + 3, 4);
    ctx.stroke();

    // ON/OFF 텍스트 표시
    ctx.fillStyle = '#94a3b8';
    ctx.font = '900 8px Outfit';
    ctx.fillText('ON', 10, -15);
    ctx.fillText('OFF', -16, -15);

    ctx.restore();
  }

  // 전기 회로의 실제 폐회로(Closed Loop) 물리적 연결 경로 좌표들을 순서대로 생성하는 함수
  function getFullPathCoords(path) {
    if (!path || path.length === 0) return [];
    
    const battery = components.find(c => c.type === 'battery');
    if (!battery) return [];
    
    // 배터리 단자 및 전선 우회 좌표 설정
    const batPosCoords = { x: BATTERY_X + BATTERY_W - 37, y: BATTERY_Y - 10 };
    const batNegCoords = { x: BATTERY_X + 37, y: BATTERY_Y - 10 };
    
    const posHoleCoords = getHoleCoords(battery.pos.col, battery.pos.row);
    const negHoleCoords = getHoleCoords(battery.neg.col, battery.neg.row);
    
    const posRouteY = battery.pos.row < 5 ? 110 : BOARD_START_Y + BOARD_HEIGHT + 32;
    const negRouteY = battery.neg.row < 5 ? 110 : BOARD_START_Y + BOARD_HEIGHT + 32;
    
    const posBypassX = BATTERY_X + BATTERY_W + 15;
    const negBypassX = BATTERY_X - 15;
    
    let coords = [];
    
    // 1. 배터리 (+) 전선 경로
    coords.push(batPosCoords);
    coords.push({ x: batPosCoords.x, y: batPosCoords.y - 15 });
    coords.push({ x: posBypassX, y: batPosCoords.y - 15 });
    coords.push({ x: posBypassX, y: posRouteY });
    coords.push({ x: posHoleCoords.x, y: posRouteY });
    coords.push(posHoleCoords);
    
    // 점퍼선과 온 스위치를 이용한 연결 경로 추적용 BFS 그래프 빌드
    const connGraph = {};
    components.forEach(comp => {
      if (comp.type === 'wire') {
        const k1 = getHoleNodeKey(comp.from.col, comp.from.row);
        const k2 = getHoleNodeKey(comp.to.col, comp.to.row);
        if (!connGraph[k1]) connGraph[k1] = [];
        if (!connGraph[k2]) connGraph[k2] = [];
        connGraph[k1].push({ to: k2, element: comp });
        connGraph[k2].push({ to: k1, element: comp });
      } else if (comp.type === 'switch' && comp.state === 'on') {
        const k1 = getHoleNodeKey(comp.pin1.col, comp.pin1.row);
        const k2 = getHoleNodeKey(comp.pin2.col, comp.pin2.row);
        if (!connGraph[k1]) connGraph[k1] = [];
        if (!connGraph[k2]) connGraph[k2] = [];
        connGraph[k1].push({ to: k2, element: comp });
        connGraph[k2].push({ to: k1, element: comp });
      }
    });
    
    function findBfsPath(startKey, endKey) {
      if (startKey === endKey) return [];
      const queue = [[startKey, []]];
      const visited = new Set([startKey]);
      
      while (queue.length > 0) {
        const [curr, p] = queue.shift();
        if (curr === endKey) return p;
        
        const adj = connGraph[curr] || [];
        for (let edge of adj) {
          if (!visited.has(edge.to)) {
            visited.add(edge.to);
            queue.push([edge.to, [...p, edge]]);
          }
        }
      }
      return [];
    }
    
    // 두 브래드보드 구멍 간의 연결(세로줄 내부 및 점퍼선 우회) 세그먼트 좌표 생성
    function addConnectionSegments(fromHole, toHole) {
      const startKey = getHoleNodeKey(fromHole.col, fromHole.row);
      const endKey = getHoleNodeKey(toHole.col, toHole.row);
      
      const bfsPath = findBfsPath(startKey, endKey);
      let currHole = { ...fromHole };
      
      if (bfsPath.length === 0) {
        coords.push(getHoleCoords(toHole.col, toHole.row));
        return;
      }
      
      bfsPath.forEach(step => {
        const comp = step.element;
        if (comp.type === 'wire') {
          const pin1 = comp.from;
          const pin2 = comp.to;
          const isPin1Start = (getHoleNodeKey(pin1.col, pin1.row) === getHoleNodeKey(currHole.col, currHole.row));
          const startPin = isPin1Start ? pin1 : pin2;
          const endPin = isPin1Start ? pin2 : pin1;
          
          coords.push(getHoleCoords(startPin.col, startPin.row));
          
          // 점퍼선 처짐 곡선형 흐름 모사 (중간 제어점 추가)
          const p1 = getHoleCoords(startPin.col, startPin.row);
          const p2 = getHoleCoords(endPin.col, endPin.row);
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2 + 15;
          coords.push({ x: midX, y: midY });
          coords.push(p2);
          
          currHole = endPin;
        } else if (comp.type === 'switch') {
          const pin1 = comp.pin1;
          const pin2 = comp.pin2;
          const isPin1Start = (getHoleNodeKey(pin1.col, pin1.row) === getHoleNodeKey(currHole.col, currHole.row));
          const startPin = isPin1Start ? pin1 : pin2;
          const endPin = isPin1Start ? pin2 : pin1;
          
          coords.push(getHoleCoords(startPin.col, startPin.row));
          coords.push(getHoleCoords(endPin.col, endPin.row));
          currHole = endPin;
        }
      });
      
      coords.push(getHoleCoords(toHole.col, toHole.row));
    }
    
    let lastHole = battery.pos;
    
    // 2. 직렬 연결된 능동 소자들(저항, LED) 통과
    path.forEach(edge => {
      const comp = edge.element;
      if (comp.type === 'resistor') {
        const isFromStart = (edge.direction === 1);
        const startPin = isFromStart ? comp.from : comp.to;
        const endPin = isFromStart ? comp.to : comp.from;
        
        addConnectionSegments(lastHole, startPin);
        coords.push(getHoleCoords(endPin.col, endPin.row));
        lastHole = endPin;
      } else if (comp.type === 'led') {
        const isAnodeStart = (edge.direction === 1);
        const startPin = isAnodeStart ? comp.anode : comp.cathode;
        const endPin = isAnodeStart ? comp.cathode : comp.anode;
        
        addConnectionSegments(lastHole, startPin);
        coords.push(getHoleCoords(endPin.col, endPin.row));
        lastHole = endPin;
      }
    });
    
    // 3. 마지막 소자에서 배터리 마이너스 핀이 꽂힌 구멍까지 연결
    addConnectionSegments(lastHole, battery.neg);
    
    // 4. 배터리 (-) 전선 경로
    coords.push(getHoleCoords(battery.neg.col, battery.neg.row));
    coords.push({ x: negHoleCoords.x, y: negRouteY });
    coords.push({ x: negBypassX, y: negRouteY });
    coords.push({ x: negBypassX, y: batNegCoords.y - 15 });
    coords.push({ x: batNegCoords.x, y: batNegCoords.y - 15 });
    coords.push(batNegCoords);
    
    return coords;
  }

  // 전류 및 전자 이동을 전체적인 물리적 연결 경로를 따라 흐르도록 렌더링
  function drawCurrentFlow() {
    if (!showCurrentFlowCheck.checked || !isPlaying || circuitAnalysis.activePaths.length === 0) return;

    const isConventional = currentDirectionCheck.checked; // true: (+) -> (-), false: (-) -> (+)

    ctx.save();

    circuitAnalysis.activePaths.forEach(path => {
      let segmentCoords = getFullPathCoords(path);
      if (segmentCoords.length < 2) return;

      // 전자의 흐름(-에서 +)이면 경로 좌표의 방향을 거꾸로 뒤집음
      if (!isConventional) {
        segmentCoords = [...segmentCoords].reverse();
      }

      // 누적 거리 계산
      let totalDist = 0;
      let dists = [];
      for (let i = 0; i < segmentCoords.length - 1; i++) {
        const d = Math.hypot(segmentCoords[i+1].x - segmentCoords[i].x, segmentCoords[i+1].y - segmentCoords[i].y);
        dists.push(d);
        totalDist += d;
      }

      // 느린 이동 속도로 조정 (0.0007)
      const speed = 0.0007; 
      const timeOffset = (Date.now() * speed) % 1;

      // 물리적 길이에 비례해 적절한 간격(60px)으로 촘촘하게 파티클 노출
      const particleCount = Math.max(8, Math.floor(totalDist / 60));
      for (let i = 0; i < particleCount; i++) {
        const offset = (timeOffset + i / particleCount) % 1;
        const targetDist = totalDist * offset;
        
        let cumDist = 0;
        let targetX = segmentCoords[0].x;
        let targetY = segmentCoords[0].y;

        for (let j = 0; j < dists.length; j++) {
          if (targetDist >= cumDist && targetDist <= cumDist + dists[j]) {
            const segmentOffset = (targetDist - cumDist) / dists[j];
            const p1 = segmentCoords[j];
            const p2 = segmentCoords[j+1];
            targetX = p1.x + (p2.x - p1.x) * segmentOffset;
            targetY = p1.y + (p2.y - p1.y) * segmentOffset;
            break;
          }
          cumDist += dists[j];
        }

        // 파티클 도트 렌더링
        ctx.shadowBlur = 6;
        ctx.shadowColor = isConventional ? '#fbbf24' : '#00f0ff'; // 전류 노랑, 전자 하늘/네온시안
        ctx.fillStyle = isConventional ? '#fbbf24' : '#e0f2fe';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();
  }`;

lines.splice(1738, 2363 - 1738 + 1, replacementCode);

fs.writeFileSync(targetFilePath, lines.join('\n'), 'utf8');
console.log('Replacement completed successfully!');
