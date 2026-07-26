/**
 * 고등학교 과학 탐구 - 가상 브래드보드 시뮬레이션
 * script.js
 */

(function () {
  // ==========================================================================
  // 1. 초기 설정 및 전역 변수
  // ==========================================================================
  const canvas = document.getElementById('simCanvas');
  const ctx = canvas.getContext('2d');
  const container = document.getElementById('canvasContainer');

  // UI 요소들
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebarExpandBtn = document.getElementById('sidebarExpandBtn');
  const experimentSelect = document.getElementById('experimentSelect');
  
  const messageBoard = document.getElementById('messageBoard');
  const messageText = document.getElementById('messageText');
  const canvasHint = document.getElementById('canvasHint');

  // 보기 옵션
  const showInternalWiresCheck = document.getElementById('showInternalWires');
  const showCurrentFlowCheck = document.getElementById('showCurrentFlow');
  const currentDirectionCheck = document.getElementById('currentDirection');
  const flowToggleBtn = document.getElementById('flowToggleBtn');
  const flowTypeText = document.getElementById('flowTypeText');

  // 부품 선택 버튼
  const compButtons = document.querySelectorAll('.comp-select-btn');
  const wireOptions = document.getElementById('wireOptions');
  const resistorOptions = document.getElementById('resistorOptions');
  const ledOptions = document.getElementById('ledOptions');
  const resistorValBtns = document.querySelectorAll('.resistor-val-btn');
  const flowSpeedSlider = document.getElementById('flowSpeed');
  const flowSpeedValText = document.getElementById('flowSpeedVal');
  const resetCircuitBtn = document.getElementById('resetCircuitBtn');
  let currentSpeedMultiplier = 1.0;

  // 필기 도구
  const drawModeBtn = document.getElementById('drawModeBtn');
  const drawToolsSub = document.getElementById('drawToolsSub');
  const penSizeSlider = document.getElementById('penSize');
  const penSizeVal = document.getElementById('penSizeVal');
  const eraserBtn = document.getElementById('eraserBtn');
  const clearDrawBtn = document.getElementById('clearDrawBtn');
  const penColorBtns = document.querySelectorAll('.pen-color-btn');

  // 뷰포트 상태 (Zoom & Pan)
  let scale = 1.0;
  let panX = 0;
  let panY = 0;
  const minScale = 0.4;
  const maxScale = 3.0;

  // 핀 격자 구성 (가로 17칸, 세로 10칸)
  // 열번호는 실제 이미지처럼 왼쪽부터 17, 16, 15 ... 1로 매핑
  const COL_COUNT = 17;
  const ROW_COUNT = 10;
  const PITCH_X = 42; // 구멍 간격 (px)
  const PITCH_Y = 42; 
  const DIVIDER_GAP = 70; // e행과 f행 사이의 분리대 간격 (px)
  
  // 브래드보드 월드 좌표상의 크기 및 배치 시작점
  const BOARD_START_X = 260; 
  const BOARD_START_Y = 180;
  const BOARD_WIDTH = (COL_COUNT - 1) * PITCH_X + 120;
  const BOARD_HEIGHT = (ROW_COUNT - 1) * PITCH_Y + DIVIDER_GAP + 120;

  // 배터리 위치 (보드 좌측에 고정 배치)
  const BATTERY_X = 60;
  const BATTERY_Y = 280;
  const BATTERY_W = 120;
  const BATTERY_H = 180;

  // 회로 소자 데이터 구조
  let components = []; 
  // 필기 데이터 구조: { color, width, points: [{x, y}, ...] }
  let drawings = []; 
  let currentDrawingStroke = null;

  // 시뮬레이션 상태
  let isPlaying = true;
  let selectedComponent = null;
  let activeTool = 'wire'; // 'wire', 'battery', 'resistor', 'led', 'switch'
  let activeWireColor = '#ff3b30';
  let activeResistorVal = 220; // ohms
  let activeLedColor = 'red';
  
  let drawMode = false;
  let isEraser = false;
  let activePenColor = '#ff3b30';
  let activePenSize = 5;

  // 회로 시뮬레이션 결과 변수
  let circuitAnalysis = {
    shortCircuit: false,
    hasPower: false,
    activePaths: [], // 시각화용 전원 흐름 경로 리스트
    burntLeds: new Set(),
    litLeds: new Set(),
    activeNodes: new Set()
  };

  // 포인터 트래킹 (멀티터치 핀치 줌 대응)
  let pointers = new Map();
  let lastTouchDist = 0;
  let isPanning = false;
  let lastPointerX = 0;
  let lastPointerY = 0;

  // 부품 배치 중 드래그용 상태
  let placementStartHole = null; // { col, row }
  let placementCurrentPos = null; // 월드 좌표 { x, y } 또는 { col, row }
  let movingTerminal = null; // { comp, terminal: 'from'|'to'|'anode'|'cathode'|'pos'|'neg'|'pin1'|'pin2' }
  let lastTapTime = 0;
  let lastTapComponent = null;

  // 실험 데이터
  let currentExperiment = 'free';


  // ==========================================================================
  // 2. 테마 관리 (라이트 / 다크)
  // ==========================================================================
  function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light-mode';
    document.documentElement.className = savedTheme;
    updateThemeUI();
  }

  function toggleTheme() {
    if (document.documentElement.classList.contains('light-mode')) {
      document.documentElement.className = 'dark-mode';
      localStorage.setItem('theme', 'dark-mode');
    } else {
      document.documentElement.className = 'light-mode';
      localStorage.setItem('theme', 'light-mode');
    }
    updateThemeUI();
    draw();
  }

  function updateThemeUI() {
    const isDark = document.documentElement.classList.contains('dark-mode');
    if (isDark) {
      themeToggleBtn.querySelector('.sun-icon').style.display = 'block';
      themeToggleBtn.querySelector('.moon-icon').style.display = 'none';
    } else {
      themeToggleBtn.querySelector('.sun-icon').style.display = 'none';
      themeToggleBtn.querySelector('.moon-icon').style.display = 'block';
    }
  }

  themeToggleBtn.addEventListener('click', toggleTheme);

  // ==========================================================================
  // 3. 사이드바 접기/펴기 기능 및 컨트롤 연동
  // ==========================================================================
  function setSidebarState(collapsed) {
    if (collapsed) {
      sidebar.classList.add('collapsed');
      sidebarExpandBtn.style.display = 'flex';
    } else {
      sidebar.classList.remove('collapsed');
      sidebarExpandBtn.style.display = 'none';
    }
    // 350ms 동안 실시간 애니메이션 루프를 돌아 캔버스가 늘어나는 현상 완벽 방지
    const startTime = Date.now();
    function animateResize() {
      resizeCanvas();
      if (Date.now() - startTime < 350) {
        requestAnimationFrame(animateResize);
      }
    }
    requestAnimationFrame(animateResize);
  }

  sidebarToggleBtn.addEventListener('click', () => setSidebarState(true));
  sidebarExpandBtn.addEventListener('click', () => setSidebarState(false));

  // 모바일 화면 대응 - 바깥 터치 시 자동으로 접히는 로직은 필요시 추가 가능

  // ==========================================================================
  // 4. 캔버스 리사이즈 및 뷰포트 맞춤 (Fit)
  // ==========================================================================
  function resizeCanvas() {
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    draw();
  }

  window.addEventListener('resize', resizeCanvas);

  function fitToScreen() {
    const rect = container.getBoundingClientRect();
    const wWidth = rect.width;
    const wHeight = rect.height;

    // 브래드보드와 배터리가 다 보일 수 있도록 영역 계산
    const minX = BATTERY_X - 30;
    const maxX = BOARD_START_X + BOARD_WIDTH + 30;
    const minY = Math.min(BATTERY_Y, BOARD_START_Y) - 50;
    const maxY = Math.max(BATTERY_Y + BATTERY_H, BOARD_START_Y + BOARD_HEIGHT) + 50;

    const contentW = maxX - minX;
    const contentH = maxY - minY;

    // 화면 비율에 맞는 배율 계산
    const scaleX = wWidth / contentW;
    const scaleY = wHeight / contentH;
    scale = Math.min(scaleX, scaleY, 1.2); // 너무 커지지 않도록 1.2로 상한

    // 중앙 정렬
    panX = (wWidth - contentW * scale) / 2 - minX * scale;
    panY = (wHeight - contentH * scale) / 2 - minY * scale;

    draw();
  }

  document.getElementById('zoomInBtn').addEventListener('click', () => zoomAroundCenter(1.15));
  document.getElementById('zoomOutBtn').addEventListener('click', () => zoomAroundCenter(0.85));
  document.getElementById('zoomFitBtn').addEventListener('click', fitToScreen);

  function zoomAroundCenter(factor) {
    const targetScale = Math.min(Math.max(scale * factor, minScale), maxScale);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    // 중심 지점 기준으로 pan 변환 계산
    panX = cx - (cx - panX) * (targetScale / scale);
    panY = cy - (cy - panY) * (targetScale / scale);
    scale = targetScale;
    draw();
  }

  // ==========================================================================
  // 5. 좌표 변환 (스크린 <-> 월드)
  // ==========================================================================
  function screenToWorld(sx, sy) {
    return {
      x: (sx - panX) / scale,
      y: (sy - panY) / scale
    };
  }

  // 브래드보드 구멍 찾기 (월드 좌표 기준 가까운 핀 검출)
  function getHoleAt(worldPos) {
    const x = worldPos.x;
    const y = worldPos.y;

    for (let c = 0; c < COL_COUNT; c++) {
      const hx = BOARD_START_X + 60 + c * PITCH_X;
      // 가로 거리 검사
      if (Math.abs(x - hx) < PITCH_X / 1.7) {
        // 행 검사
        for (let r = 0; r < ROW_COUNT; r++) {
          let hy = BOARD_START_Y + 60 + r * PITCH_Y;
          if (r >= 5) {
            hy += DIVIDER_GAP; // e행-f행 분리대
          }
          if (Math.abs(y - hy) < PITCH_Y / 1.7) {
            return { col: 17 - c, row: r, x: hx, y: hy }; // 열 인덱스를 17~1로 변환
          }
        }
      }
    }
    return null;
  }

  // 격자 정보를 실제 월드 좌표로 변환
  function getHoleCoords(col, row) {
    const cIdx = 17 - col; // 17번 열이 배열 인덱스 0
    const hx = BOARD_START_X + 60 + cIdx * PITCH_X;
    let hy = BOARD_START_Y + 60 + row * PITCH_Y;
    if (row >= 5) {
      hy += DIVIDER_GAP;
    }
    return { x: hx, y: hy };
  }

  // ==========================================================================
  // 6. UI 입력 제어 및 도구 선택
  // ==========================================================================
  // 선택된 소자의 옵션값을 사이드바 설정 UI와 양방향 동기화하는 함수
  function syncSidebarWithOptions(comp) {
    if (!comp) return;
    
    // 부품 선택 버튼들 활성화 상태 동기화
    compButtons.forEach(b => {
      if (b.dataset.type === comp.type) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
    activeTool = comp.type;
    
    // 서브 옵션 패널 노출 상태 동기화
    wireOptions.style.display = comp.type === 'wire' ? 'block' : 'none';
    resistorOptions.style.display = comp.type === 'resistor' ? 'block' : 'none';
    ledOptions.style.display = comp.type === 'led' ? 'block' : 'none';
    
    if (comp.type === 'wire') {
      activeWireColor = comp.color;
      document.querySelectorAll('#wireOptions .color-btn').forEach(btn => {
        if (btn.dataset.color === comp.color) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    } else if (comp.type === 'resistor') {
      activeResistorVal = comp.value;
      if (resistorValBtns) {
        resistorValBtns.forEach(btn => {
          if (parseInt(btn.dataset.val) === comp.value) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }
    } else if (comp.type === 'led') {
      activeLedColor = comp.color;
      document.querySelectorAll('#ledOptions .color-btn').forEach(btn => {
        if (btn.dataset.color === comp.color) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
    updateCanvasHint();
  }

  compButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (drawMode) {
        // 그리기 모드 해제
        toggleDrawMode(false);
      }
      compButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTool = btn.dataset.type;
      
      // 소자 선택 해제
      selectedComponent = null;

      // 서브 옵션 보이기
      wireOptions.style.display = activeTool === 'wire' ? 'block' : 'none';
      resistorOptions.style.display = activeTool === 'resistor' ? 'block' : 'none';
      ledOptions.style.display = activeTool === 'led' ? 'block' : 'none';

      updateCanvasHint();
      draw();
    });
  });

  // 점퍼선 색상 선택
  document.querySelectorAll('#wireOptions .color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#wireOptions .color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeWireColor = btn.dataset.color;
      
      // 선택된 소자가 점퍼선인 경우, 점퍼선 색상을 즉시 변경
      if (selectedComponent && selectedComponent.type === 'wire') {
        selectedComponent.color = activeWireColor;
        solveCircuit();
        draw();
      }
    });
  });

  // 저항 설정 버튼
  if (resistorValBtns) {
    resistorValBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        resistorValBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeResistorVal = parseInt(btn.dataset.val);
        
        if (selectedComponent && selectedComponent.type === 'resistor') {
          selectedComponent.value = activeResistorVal;
          solveCircuit();
          draw();
        }
      });
    });
  }

  // 전류 속도 조절
  if (flowSpeedSlider) {
    flowSpeedSlider.addEventListener('input', (e) => {
      currentSpeedMultiplier = parseFloat(e.target.value);
      if (flowSpeedValText) flowSpeedValText.innerText = currentSpeedMultiplier.toFixed(1) + 'x';
    });
  }

  // 회로 초기화
  if (resetCircuitBtn) {
    resetCircuitBtn.addEventListener('click', () => {
      if (confirm('회로를 완전히 초기화하시겠습니까?')) {
        components = [];
        circuitAnalysis = {
          shortCircuit: false,
          hasPower: false,
          activePaths: [],
          burntLeds: new Set(),
          litLeds: new Set(),
          activeNodes: new Set()
        };
        selectedComponent = null;
        updateMessage("회로가 초기화되었습니다. 실험을 다시 시작해보세요.", "");
        draw();
      }
    });
  }

  // LED 색상 선택
  document.querySelectorAll('#ledOptions .color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ledOptions .color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeLedColor = btn.dataset.color;
      
      // 선택된 소자가 LED인 경우, LED 색상을 즉시 변경
      if (selectedComponent && selectedComponent.type === 'led') {
        selectedComponent.color = activeLedColor;
        solveCircuit();
        draw();
      }
    });
  });

  // 힌트 텍스트 갱신
  function updateCanvasHint() {
    if (drawMode) {
      canvasHint.querySelector('span').innerText = isEraser 
        ? "지우개 모드: 필기된 선 위를 드래그하여 지우세요." 
        : "필기 모드: 캔버스에 마우스나 터치로 필기할 수 있습니다. (두 손가락 드래그 시 화면 이동/확대 가능)";
      return;
    }

    let text = "";
    switch(activeTool) {
      case 'wire':
        text = "점퍼선 모드: 보드의 구멍 두 곳을 터치하여 연결선을 배치하세요.";
        break;
      case 'battery':
        text = "배터리 모드: 보드의 구멍을 클릭하여 (+, 빨강) 단자선과 (-, 검정) 단자선을 차례로 배치하세요.";
        break;
      case 'resistor':
        text = "저항 모드: 보드의 구멍 두 곳을 터치하여 저항기를 연결하세요.";
        break;
      case 'led':
        text = "LED 모드: 긴다리(+)와 짧은다리(-)가 들어갈 보드의 구멍 두 곳을 차례로 선택하세요.";
        break;
      case 'switch':
        text = "스위치 모드: 가로/세로 연결할 두 구멍을 터치하여 스위치를 꽂으세요.";
        break;
    }
    canvasHint.querySelector('span').innerText = text;
  }

  // 보기 옵션 변경
  showInternalWiresCheck.addEventListener('change', draw);
  showCurrentFlowCheck.addEventListener('change', draw);
  currentDirectionCheck.addEventListener('change', () => {
    const isChecked = currentDirectionCheck.checked;
    flowTypeText.innerText = isChecked ? "전류의 방향 표시 (+에서 -)" : "전자의 방향 표시 (-에서 +)";
    draw();
  });
  flowToggleBtn.addEventListener('click', () => {
    currentDirectionCheck.checked = !currentDirectionCheck.checked;
    currentDirectionCheck.dispatchEvent(new Event('change'));
  });

  // ==========================================================================
  // 7. 필기(그리기) 도구 핸들링
  // ==========================================================================
  function toggleDrawMode(active) {
    drawMode = active;
    if (drawMode) {
      drawModeBtn.classList.add('active');
      drawModeBtn.querySelector('span').innerText = "필기 모드 ON";
      selectedComponent = null;
    } else {
      drawModeBtn.classList.remove('active');
      drawModeBtn.querySelector('span').innerText = "필기 모드 OFF";
      // 이전 선택 부품 버튼에 active 다시 활성화
      const activeBtn = Array.from(compButtons).find(b => b.dataset.type === activeTool);
      if (activeBtn) activeBtn.classList.add('active');
    }
    updateCanvasHint();
    draw();
  }

  drawModeBtn.addEventListener('click', () => toggleDrawMode(!drawMode));

  // 펜 색상 선택
  penColorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      penColorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePenColor = btn.dataset.penColor;
      isEraser = false;
      eraserBtn.classList.remove('active');
      if (!drawMode) toggleDrawMode(true); // 펜 선택 시 필기 모드 자동 활성화
      updateCanvasHint();
    });
  });

  // 펜 두께 조절
  penSizeSlider.addEventListener('input', (e) => {
    activePenSize = parseInt(e.target.value);
    penSizeVal.innerText = activePenSize + "px";
  });

  // 지우개 선택
  eraserBtn.addEventListener('click', () => {
    isEraser = !isEraser;
    if (isEraser) {
      eraserBtn.classList.add('active');
      if (!drawMode) toggleDrawMode(true); // 지우개 선택 시 필기 모드 자동 활성화
    } else {
      eraserBtn.classList.remove('active');
    }
    updateCanvasHint();
  });

  // 전체 삭제
  clearDrawBtn.addEventListener('click', () => {
    drawings = [];
    draw();
  });

  // 지우개 알고리즘 (점과 선 사이의 거리 측정으로 획 삭제)
  function checkEraseAt(wPt) {
    const threshold = 15; // 삭제 판정 반경 (월드 좌표)
    let hitIndex = -1;

    for (let i = 0; i < drawings.length; i++) {
      const stroke = drawings[i];
      for (let j = 0; j < stroke.points.length; j++) {
        const pt = stroke.points[j];
        const dist = Math.hypot(pt.x - wPt.x, pt.y - wPt.y);
        if (dist < (stroke.width / 2 + threshold)) {
          hitIndex = i;
          break;
        }
      }
      if (hitIndex !== -1) break;
    }

    if (hitIndex !== -1) {
      drawings.splice(hitIndex, 1);
      draw();
    }
  }

  // ==========================================================================
  // 8. 포인터 이벤트 리스너 (줌, 판, 배치, 필기)
  // ==========================================================================
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  // 키보드 딜리트키 입력 대응 (선택 소자 삭제)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedComponent && !drawMode) {
        deleteComponent(selectedComponent);
      }
    }
  });


  function onPointerDown(e) {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const wPt = screenToWorld(screenX, screenY);

    // 더블 클릭(더블 탭) 감지하여 부품 삭제
    if (e.button === 0 && !drawMode) {
      const clickedComp = getComponentAt(wPt);
      if (clickedComp) {
        const now = Date.now();
        if (now - lastTapTime < 300 && lastTapComponent && lastTapComponent.id === clickedComp.id) {
          deleteComponent(clickedComp);
          lastTapTime = 0;
          lastTapComponent = null;
          // 드래그 상태 초기화 및 동작 조기 종료
          placementStartHole = null;
          placementCurrentPos = null;
          movingTerminal = null;
          return;
        }
        lastTapTime = now;
        lastTapComponent = clickedComp;
      } else {
        lastTapTime = 0;
        lastTapComponent = null;
      }
    }

    pointers.set(e.pointerId, { 
      clientX: e.clientX, 
      clientY: e.clientY,
      screenX: screenX,
      screenY: screenY,
      worldX: wPt.x,
      worldY: wPt.y
    });

    // 멀티터치 체크 (줌/이동 우선)
    if (pointers.size >= 2) {
      isPanning = true;
      currentDrawingStroke = null; // 필기 취소
      lastTouchDist = getPointersDist();
      return;
    }

    // 마우스 우클릭 또는 휠 클릭은 무조건 화면 이동
    if (e.button === 2 || e.button === 1) {
      isPanning = true;
      lastPointerX = screenX;
      lastPointerY = screenY;
      return;
    }

    // 1. 필기 모드 처리
    if (drawMode) {
      if (isEraser) {
        checkEraseAt(wPt);
      } else {
        currentDrawingStroke = {
          color: activePenColor,
          width: activePenSize,
          points: [wPt]
        };
        drawings.push(currentDrawingStroke);
      }
      return;
    }

    // 스위치 노브 클릭 체크
    const clickedSwitch = getSwitchKnobAt(wPt);
    if (clickedSwitch) {
      clickedSwitch.state = clickedSwitch.state === 'on' ? 'off' : 'on';
      solveCircuit();
      draw();
      return;
    }

    // 2. 부품 배치 및 조작 모드
    // 컴포넌트 이동/터미널 드래그 시작 체크
    const terminalInfo = getComponentTerminalAt(wPt);
    if (terminalInfo) {
      movingTerminal = terminalInfo;
      // 잡고 드래그할 핀 시작점 초기화
      placementStartHole = { col: terminalInfo.col, row: terminalInfo.row };
      placementCurrentPos = { ...wPt };
      return;
    }

    // 이미 배치된 컴포넌트 선택
    const clickedComp = getComponentAt(wPt);
    if (clickedComp) {
      selectedComponent = clickedComp;
      syncSidebarWithOptions(clickedComp);
      draw();
      return;
    } else {
      selectedComponent = null;
    }

    // 새 부품 배치 시작 (격자 구멍 터치)
    const targetHole = getHoleAt(wPt);
    if (targetHole) {
      placementStartHole = targetHole;
      placementCurrentPos = { ...wPt };
      
      // 즉시 1차 스냅 좌표 할당
      if (activeTool === 'battery') {
        // 배터리는 첫 구멍 클릭 시 무조건 positive 단자로 임시 저장
        placementCurrentPos = { col: targetHole.col, row: targetHole.row };
      }
      draw();
    } else {
      // 보드 바깥 공간 드래그 -> 화면 이동 시작
      isPanning = true;
      lastPointerX = screenX;
      lastPointerY = screenY;
    }
  }

  function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const wPt = screenToWorld(screenX, screenY);

    const activePointer = pointers.get(e.pointerId);
    activePointer.clientX = e.clientX;
    activePointer.clientY = e.clientY;
    activePointer.screenX = screenX;
    activePointer.screenY = screenY;
    activePointer.worldX = wPt.x;
    activePointer.worldY = wPt.y;

    // 1. 멀티터치 줌/이동 조작
    if (pointers.size >= 2) {
      const newDist = getPointersDist();
      const scaleFactor = newDist / lastTouchDist;
      
      // 핀치 줌의 가상 중심 계산
      const pts = Array.from(pointers.values());
      const midScreenX = (pts[0].screenX + pts[1].screenX) / 2;
      const midScreenY = (pts[0].screenY + pts[1].screenY) / 2;
      
      const newScale = Math.min(Math.max(scale * scaleFactor, minScale), maxScale);
      
      // 중심점 유지 줌
      panX = midScreenX - (midScreenX - panX) * (newScale / scale);
      panY = midScreenY - (midScreenY - panY) * (newScale / scale);
      scale = newScale;
      lastTouchDist = newDist;

      // 두 터치의 이동량을 화면 이동에 반영
      if (lastPointerX && lastPointerY) {
        const dX = midScreenX - lastPointerX;
        const dY = midScreenY - lastPointerY;
        panX += dX;
        panY += dY;
      }
      lastPointerX = midScreenX;
      lastPointerY = midScreenY;
      
      draw();
      return;
    }

    // 2. 단일 포인터 화면 이동(Pan)
    if (isPanning) {
      const dX = screenX - lastPointerX;
      const dY = screenY - lastPointerY;
      panX += dX;
      panY += dY;
      lastPointerX = screenX;
      lastPointerY = screenY;
      draw();
      return;
    }

    // 3. 필기 입력 처리
    if (drawMode && currentDrawingStroke) {
      if (isEraser) {
        checkEraseAt(wPt);
      } else {
        currentDrawingStroke.points.push(wPt);
        draw();
      }
      return;
    }

    // 4. 컴포넌트 단자 이동 드래그 처리
    if (movingTerminal) {
      const currentHole = getHoleAt(wPt);
      if (currentHole) {
        placementCurrentPos = currentHole;
      } else {
        placementCurrentPos = { ...wPt };
      }
      draw();
      return;
    }

    // 5. 새 부품 드래그/배치 가이드 업데이트
    if (placementStartHole) {
      const currentHole = getHoleAt(wPt);
      if (currentHole) {
        placementCurrentPos = currentHole;
      } else {
        placementCurrentPos = { ...wPt };
      }
      draw();
    }
  }

  function onPointerUp(e) {
    if (!pointers.has(e.pointerId)) return;
    
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const wPt = screenToWorld(screenX, screenY);

    pointers.delete(e.pointerId);

    // 멀티터치 마무리 처리
    if (pointers.size < 2) {
      isPanning = false;
      lastPointerX = 0;
      lastPointerY = 0;
    }

    if (currentDrawingStroke) {
      currentDrawingStroke = null;
    }

    // 1. 단자 이동이 멈춘 경우 실제 컴포넌트 정보 업데이트
    if (movingTerminal) {
      const endHole = getHoleAt(wPt);
      if (endHole) {
        const comp = movingTerminal.comp;
        const terminal = movingTerminal.terminal;
        
        // 이동 가능한 단자 할당
        if (terminal === 'from') comp.from = { col: endHole.col, row: endHole.row };
        else if (terminal === 'to') comp.to = { col: endHole.col, row: endHole.row };
        else if (terminal === 'anode') comp.anode = { col: endHole.col, row: endHole.row };
        else if (terminal === 'cathode') comp.cathode = { col: endHole.col, row: endHole.row };
        else if (terminal === 'pos') comp.pos = { col: endHole.col, row: endHole.row };
        else if (terminal === 'neg') comp.neg = { col: endHole.col, row: endHole.row };
        else if (terminal === 'pin1') comp.pin1 = { col: endHole.col, row: endHole.row };
        else if (terminal === 'pin2') comp.pin2 = { col: endHole.col, row: endHole.row };

        // 배터리 자가수정 방지 및 배터리 극성 크로스 체크
        if (comp.type === 'battery') {
          if (comp.pos.col === comp.neg.col && comp.pos.row === comp.neg.row) {
            // 같은 자리에 꽂히면 이전으로 복구
            comp[terminal] = { col: movingTerminal.col, row: movingTerminal.row };
          }
        }
        
        solveCircuit();
      }
      movingTerminal = null;
      placementStartHole = null;
      placementCurrentPos = null;
      draw();
      return;
    }

    // 2. 부품 신규 배치 완료 처리
    if (placementStartHole) {
      const endHole = getHoleAt(wPt);
      // 시작 홀과 다른 유효한 홀에 꽂았을 때만 부품 생성
      if (endHole && (placementStartHole.col !== endHole.col || placementStartHole.row !== endHole.row)) {
        createAndAddComponent(placementStartHole, endHole);
      }
      placementStartHole = null;
      placementCurrentPos = null;
      draw();
    }
  }

  function onPointerCancel(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) {
      isPanning = false;
    }
    currentDrawingStroke = null;
    placementStartHole = null;
    placementCurrentPos = null;
    movingTerminal = null;
    draw();
  }

  function getPointersDist() {
    const pts = Array.from(pointers.values());
    return Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
  }

  // 휠 스케일링 (마우스 중심 줌)
  function onWheel(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const zoomIntensity = 0.08;
    const delta = e.deltaY < 0 ? 1 : -1;
    const zoomFactor = 1 + delta * zoomIntensity;
    
    const targetScale = Math.min(Math.max(scale * zoomFactor, minScale), maxScale);

    // 마우스 커서 아래 지점 고정
    panX = screenX - (screenX - panX) * (targetScale / scale);
    panY = screenY - (screenY - panY) * (targetScale / scale);
    scale = targetScale;

    draw();
  }

  // 마우스 우클릭 기본 메뉴창 뜨는 것 방지 (화면이동용 마우스 우클릭 대응)
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // ==========================================================================
  // 9. 부품 추가, 관리 및 충돌 체크
  // ==========================================================================
  function createAndAddComponent(startHole, endHole) {
    // 이미 존재하는 자리에 동일 소자가 중복 배치되는지 등의 룰 체크
    let newComp = null;
    
    if (activeTool === 'wire') {
      newComp = {
        type: 'wire',
        id: 'wire_' + Date.now(),
        from: { col: startHole.col, row: startHole.row },
        to: { col: endHole.col, row: endHole.row },
        color: activeWireColor
      };
    } else if (activeTool === 'battery') {
      newComp = {
        type: 'battery',
        id: 'battery_' + Date.now(),
        pos: { col: startHole.col, row: startHole.row },
        neg: { col: endHole.col, row: endHole.row }
      };
      // 배터리는 1개만 있게 제어
      components = components.filter(c => c.type !== 'battery');
    } else if (activeTool === 'resistor') {
      newComp = {
        type: 'resistor',
        id: 'resistor_' + Date.now(),
        from: { col: startHole.col, row: startHole.row },
        to: { col: endHole.col, row: endHole.row },
        value: activeResistorVal
      };
    } else if (activeTool === 'led') {
      newComp = {
        type: 'led',
        id: 'led_' + Date.now(),
        anode: { col: startHole.col, row: startHole.row }, // 긴 다리 (+)
        cathode: { col: endHole.col, row: endHole.row },  // 짧은 다리 (-)
        color: activeLedColor
      };
    } else if (activeTool === 'switch') {
      newComp = {
        type: 'switch',
        id: 'switch_' + Date.now(),
        pin1: { col: startHole.col, row: startHole.row },
        pin2: { col: endHole.col, row: endHole.row },
        state: 'off'
      };
    }

    if (newComp) {
      components.push(newComp);
      selectedComponent = newComp;
      solveCircuit();
    }
  }

  function deleteComponent(comp) {
    components = components.filter(c => c.id !== comp.id);
    selectedComponent = null;
    solveCircuit();
    draw();
  }

  // 월드 좌표 상 어떤 컴포넌트의 단자에 가까운지 판별 (조작감 향상용)
  function getComponentTerminalAt(worldPos) {
    const range = 12; // 반응 반경 (px)
    for (let comp of components) {
      if (comp.type === 'wire' || comp.type === 'resistor') {
        const c1 = getHoleCoords(comp.from.col, comp.from.row);
        const c2 = getHoleCoords(comp.to.col, comp.to.row);
        if (Math.hypot(c1.x - worldPos.x, c1.y - worldPos.y) < range) {
          return { comp, terminal: 'from', col: comp.from.col, row: comp.from.row };
        }
        if (Math.hypot(c2.x - worldPos.x, c2.y - worldPos.y) < range) {
          return { comp, terminal: 'to', col: comp.to.col, row: comp.to.row };
        }
      } else if (comp.type === 'led') {
        const c1 = getHoleCoords(comp.anode.col, comp.anode.row);
        const c2 = getHoleCoords(comp.cathode.col, comp.cathode.row);
        if (Math.hypot(c1.x - worldPos.x, c1.y - worldPos.y) < range) {
          return { comp, terminal: 'anode', col: comp.anode.col, row: comp.anode.row };
        }
        if (Math.hypot(c2.x - worldPos.x, c2.y - worldPos.y) < range) {
          return { comp, terminal: 'cathode', col: comp.cathode.col, row: comp.cathode.row };
        }
      } else if (comp.type === 'battery') {
        const c1 = getHoleCoords(comp.pos.col, comp.pos.row);
        const c2 = getHoleCoords(comp.neg.col, comp.neg.row);
        if (Math.hypot(c1.x - worldPos.x, c1.y - worldPos.y) < range) {
          return { comp, terminal: 'pos', col: comp.pos.col, row: comp.pos.row };
        }
        if (Math.hypot(c2.x - worldPos.x, c2.y - worldPos.y) < range) {
          return { comp, terminal: 'neg', col: comp.neg.col, row: comp.neg.row };
        }
      } else if (comp.type === 'switch') {
        const c1 = getHoleCoords(comp.pin1.col, comp.pin1.row);
        const c2 = getHoleCoords(comp.pin2.col, comp.pin2.row);
        if (Math.hypot(c1.x - worldPos.x, c1.y - worldPos.y) < range) {
          return { comp, terminal: 'pin1', col: comp.pin1.col, row: comp.pin1.row };
        }
        if (Math.hypot(c2.x - worldPos.x, c2.y - worldPos.y) < range) {
          return { comp, terminal: 'pin2', col: comp.pin2.col, row: comp.pin2.row };
        }
      }
    }
    return null;
  }

  // 월드 좌표 상 부품 본체 클릭 감지
  function getComponentAt(worldPos) {
    for (let comp of components) {
      if (comp.type === 'wire') {
        // 선분 근처 클릭 감지
        const c1 = getHoleCoords(comp.from.col, comp.from.row);
        const c2 = getHoleCoords(comp.to.col, comp.to.row);
        if (distToSegment(worldPos, c1, c2) < 8) return comp;
      } else if (comp.type === 'resistor') {
        const c1 = getHoleCoords(comp.from.col, comp.from.row);
        const c2 = getHoleCoords(comp.to.col, comp.to.row);
        if (distToSegment(worldPos, c1, c2) < 16) return comp;
      } else if (comp.type === 'led') {
        // LED 헤드 바디 클릭
        const c1 = getHoleCoords(comp.anode.col, comp.anode.row);
        const c2 = getHoleCoords(comp.cathode.col, comp.cathode.row);
        const midX = (c1.x + c2.x) / 2;
        const midY = (c1.y + c2.y) / 2 - 12; // 살짝 위쪽이 벌브
        if (Math.hypot(worldPos.x - midX, worldPos.y - midY) < 22) return comp;
      } else if (comp.type === 'battery') {
        // 배터리 몸체 영역 클릭 감지
        if (worldPos.x >= BATTERY_X && worldPos.x <= BATTERY_X + BATTERY_W &&
            worldPos.y >= BATTERY_Y && worldPos.y <= BATTERY_Y + BATTERY_H) {
          return comp;
        }
      } else if (comp.type === 'switch') {
        const c1 = getHoleCoords(comp.pin1.col, comp.pin1.row);
        const c2 = getHoleCoords(comp.pin2.col, comp.pin2.row);
        const midX = (c1.x + c2.x) / 2;
        const midY = (c1.y + c2.y) / 2;
        if (Math.hypot(worldPos.x - midX, worldPos.y - midY) < 20) return comp;
      }
    }
    return null;
  }

  // 스위치의 중앙 온오프 레버 클릭 감지
  function getSwitchKnobAt(worldPos) {
    for (let comp of components) {
      if (comp.type === 'switch') {
        const c1 = getHoleCoords(comp.pin1.col, comp.pin1.row);
        const c2 = getHoleCoords(comp.pin2.col, comp.pin2.row);
        const midX = (c1.x + c2.x) / 2;
        const midY = (c1.y + c2.y) / 2;
        
        // 레버는 상태에 따라 살짝 왼쪽/오른쪽으로 오프셋
        const knobX = comp.state === 'on' ? midX + 8 : midX - 8;
        if (Math.hypot(worldPos.x - knobX, worldPos.y - midY) < 12) {
          return comp;
        }
      }
    }
    return null;
  }

  // 점과 선분 사이의 최단거리 공식
  function distToSegment(p, v, w) {
    const l2 = Math.hypot(v.x - w.x, v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }


  // 브래드보드 노드 키 매핑 함수 (상단: T_1~T_17, 하단: B_1~B_17)
  function getHoleNodeKey(col, row) {
    return (row < 5 ? "T_" : "B_") + col;
  }

  // ==========================================================================
  // 10. 실시간 전기 회로 시뮬레이션 분석 엔진
  // ==========================================================================
  function solveCircuit() {
    // 1. 상태 초기화
    circuitAnalysis = {
      shortCircuit: false,
      hasPower: false,
      activePaths: [],
      burntLeds: new Set(),
      litLeds: new Set(),
      activeNodes: new Set()
    };

    // 배터리가 없는 경우 종료
    const battery = components.find(c => c.type === 'battery');
    if (!battery) {
      return;
    }
    
    circuitAnalysis.hasPower = true;

    const posNode = getHoleNodeKey(battery.pos.col, battery.pos.row);
    const negNode = getHoleNodeKey(battery.neg.col, battery.neg.row);

    // 3. 점퍼선과 닫힌 스위치들로 연결된 노드들을 하나의 "슈퍼노드(통합 전위 영역)"로 묶기 (Disjoint-Set 구현)
    const parent = {};
    function find(i) {
      if (!parent[i]) parent[i] = i;
      if (parent[i] === i) return i;
      return parent[i] = find(parent[i]);
    }
    function union(i, j) {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) {
        parent[rootI] = rootJ;
      }
    }

    // 초기화: 모든 보드 세로줄 노드 생성
    for (let c = 1; c <= COL_COUNT; c++) {
      find("T_" + c);
      find("B_" + c);
    }

    // 배치된 점퍼선과 켜져있는 스위치에 대한 병합
    components.forEach(comp => {
      if (comp.type === 'wire') {
        const k1 = getHoleNodeKey(comp.from.col, comp.from.row);
        const k2 = getHoleNodeKey(comp.to.col, comp.to.row);
        union(k1, k2);
      } else if (comp.type === 'switch' && comp.state === 'on') {
        const k1 = getHoleNodeKey(comp.pin1.col, comp.pin1.row);
        const k2 = getHoleNodeKey(comp.pin2.col, comp.pin2.row);
        union(k1, k2);
      }
    });

    // 배터리 양극이 도선이나 닫힌 스위치만으로 만나는지 체크 -> 직결 단락(쇼트)
    if (find(posNode) === find(negNode)) {
      circuitAnalysis.shortCircuit = true;
      updateMessage("⚠️ 경고: 회로에 쇼트(합선)가 발생했습니다! 배터리 전원이 차단되었습니다.", "warning");
      return;
    }

    // 4. 저항과 LED를 전기적 브릿지(에지)로 연결하여 경로 탐색 그래프 생성
    // 인접 리스트 생성
    const graph = {};
    const edges = [];

    // 그래프 노드는 슈퍼노드 대푯값들로 매핑
    function addEdge(u, v, element) {
      const ru = find(u);
      const rv = find(v);
      if (!graph[ru]) graph[ru] = [];
      if (!graph[rv]) graph[rv] = [];
      
      // 소자와 극성 정보를 포함하여 에지 등록
      graph[ru].push({ to: rv, element, direction: 1 });
      graph[rv].push({ to: ru, element, direction: -1 }); // 양방향 가능성 (LED는 나중에 방향 필터링)
    }

    components.forEach(comp => {
      if (comp.type === 'resistor') {
        const k1 = getHoleNodeKey(comp.from.col, comp.from.row);
        const k2 = getHoleNodeKey(comp.to.col, comp.to.row);
        addEdge(k1, k2, comp);
      } else if (comp.type === 'led') {
        const k1 = getHoleNodeKey(comp.anode.col, comp.anode.row);
        const k2 = getHoleNodeKey(comp.cathode.col, comp.cathode.row);
        addEdge(k1, k2, comp);
      }
    });

    // 5. 배터리 (+) 에서 배터리 (-) 까지 모든 유효 전류 경로 탐색 (DFS 백트래킹)
    const activePaths = [];
    const visitedNodes = new Set();
    const currentPath = [];

    function findPaths(currNode, targetNode) {
      const rootCurr = find(currNode);
      const rootTarget = find(targetNode);
      if (rootCurr === rootTarget) {
        activePaths.push([...currentPath]);
        return;
      }
      visitedNodes.add(rootCurr);
      const adj = graph[rootCurr] || [];
      for (let edge of adj) {
        const nextNode = edge.to;
        if (!visitedNodes.has(nextNode)) {
          if (edge.element.type === 'led') {
            const ledAnodeRoot = find(getHoleNodeKey(edge.element.anode.col, edge.element.anode.row));
            if (rootCurr !== ledAnodeRoot) continue;
          }
          currentPath.push(edge);
          findPaths(nextNode, targetNode);
          currentPath.pop();
        }
      }
      visitedNodes.delete(rootCurr);
    }
    findPaths(posNode, negNode);

    // 6. 탐색된 경로 분석
    if (activePaths.length > 0) {
      circuitAnalysis.activePaths = activePaths;
      activePaths.forEach(path => {
        const resistors = path.filter(e => e.element.type === 'resistor');
        const leds = path.filter(e => e.element.type === 'led');
        if (resistors.length === 0) {
          leds.forEach(e => circuitAnalysis.burntLeds.add(e.element.id));
        } else {
          leds.forEach(e => {
            if (!circuitAnalysis.burntLeds.has(e.element.id)) circuitAnalysis.litLeds.add(e.element.id);
          });
        }
        path.forEach(edge => circuitAnalysis.activeNodes.add(find(edge.to)));
      });
      circuitAnalysis.activeNodes.add(find(posNode));
      circuitAnalysis.activeNodes.add(find(negNode));
      if (circuitAnalysis.burntLeds.size > 0) {
        updateMessage("⚠️ 과전류 경고: 저항을 연결하지 않아 LED가 파손되었습니다! (220Ω 저항을 달아주세요)", "warning");
      } else {
        updateMessage("💡 정상 작동: 전류가 흐르고 있습니다. LED가 빛납니다!", "success");
      }
    } else {
      const led = components.find(c => c.type === 'led');
      if (led) {
        updateMessage("💡 팁: 회로에 전류가 흐르지 않습니다. LED 극성(긴다리가 배터리 +쪽)이나 스위치 온오프를 확인하세요.", "");
      } else {
        updateMessage("💡 전원과 부품을 연결하여 닫힌 회로를 만들어보세요.", "");
      }
    }
  }

  function updateMessage(text, statusClass) {
    messageText.innerText = text;
    messageBoard.className = "message-board " + statusClass;
  }

  function setExperiment(expName) {
    currentExperiment = expName;
    
    // 캔버스 초기화
    components = [];
    selectedComponent = null;

    if (expName === 'free') {
      updateMessage("반가워요! 자유롭게 회로 실험을 해보세요.", "");
    } else {
      loadTemplateCircuit(expName);
    }
    
    // 캔버스 크기 맞춤 초기 셋팅
    fitToScreen();
    solveCircuit();
    draw();
  }


  function loadTemplateCircuit(expName) {
    components = [];
    
    // 공통 배터리 추가
    components.push({
      type: 'battery',
      id: 'battery_' + Date.now(),
      pos: { col: 17, row: 0 },
      neg: { col: 1, row: 0 }
    });

    if (expName === 'basic-led') {
      components.push({
        type: 'resistor',
        id: 'resistor_' + Date.now(),
        from: { col: 17, row: 4 },
        to: { col: 10, row: 4 },
        value: 220
      });
      components.push({
        type: 'led',
        id: 'led_' + Date.now(),
        anode: { col: 10, row: 3 },
        cathode: { col: 1, row: 3 },
        color: 'red'
      });
      updateMessage("실험 1: LED 기본 회로가 배치되었습니다. 스위치 없이 직접 전원에 연결되어 켜집니다.", "success");
    } else if (expName === 'series-resistors') {
      components.push({
        type: 'resistor',
        id: 'resistor1_' + Date.now(),
        from: { col: 17, row: 4 },
        to: { col: 11, row: 4 },
        value: 220
      });
      components.push({
        type: 'resistor',
        id: 'resistor2_' + Date.now(),
        from: { col: 11, row: 3 },
        to: { col: 5, row: 3 },
        value: 1000
      });
      components.push({
        type: 'led',
        id: 'led_' + Date.now(),
        anode: { col: 5, row: 2 },
        cathode: { col: 1, row: 2 },
        color: 'red'
      });
      updateMessage("실험 2: 저항의 직렬연결 회로입니다. 두 저항을 거쳐 흐르므로 LED가 약간 어둡습니다.", "success");
    } else if (expName === 'parallel-resistors') {
      components.push({
        type: 'resistor',
        id: 'resistor1_' + Date.now(),
        from: { col: 17, row: 4 },
        to: { col: 10, row: 4 },
        value: 220
      });
      components.push({
        type: 'resistor',
        id: 'resistor2_' + Date.now(),
        from: { col: 17, row: 3 },
        to: { col: 10, row: 3 },
        value: 220
      });
      components.push({
        type: 'led',
        id: 'led_' + Date.now(),
        anode: { col: 10, row: 2 },
        cathode: { col: 1, row: 2 },
        color: 'red'
      });
      updateMessage("실험 3: 저항의 병렬연결 회로입니다. 합성 저항이 감소하여 LED가 매우 밝게 빛납니다.", "success");
    } else if (expName === 'switch-led') {
      components.push({
        type: 'switch',
        id: 'switch_' + Date.now(),
        pin1: { col: 17, row: 4 },
        pin2: { col: 12, row: 4 },
        state: 'off'
      });
      components.push({
        type: 'resistor',
        id: 'resistor_' + Date.now(),
        from: { col: 12, row: 3 },
        to: { col: 6, row: 3 },
        value: 220
      });
      components.push({
        type: 'led',
        id: 'led_' + Date.now(),
        anode: { col: 6, row: 2 },
        cathode: { col: 1, row: 2 },
        color: 'red'
      });
      updateMessage("실험 4: 스위치 제어 회로입니다. 캔버스의 스위치를 터치해 켜고 끌 수 있습니다.", "success");
    }
  }

  // 실험 주제 선택 변경 시 연동
  experimentSelect.addEventListener('change', (e) => setExperiment(e.target.value));

  // ==========================================================================
  // 12. 그래픽 렌더링 엔진 (Canvas Drawing)
  // ==========================================================================
  
  // 프레임 주기적인 렌더링 애니메이션 (전류 도트 이동용)
  function animLoop() {
    draw();
    requestAnimationFrame(animLoop);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // 줌 및 팬 행렬 변환
    ctx.translate(panX, panY);
    ctx.scale(scale, scale);

    // 1. 브래드보드 본체 배경 그리기
    drawBreadboardBase();
    
    // 2. 브래드보드 내부 구멍 및 라벨링
    drawBreadboardHoles();

    // 3. 배치된 부품 렌더링
    drawComponents();

    // 4. 회로 전류 흐름 애니메이션 효과
    drawCurrentFlow();

    // 5. 판서(스케치/필기) 렌더링
    drawStrokes();

    // 6. 부품 배치 미리보기 가이드라인 렌더링
    drawPlacementPreview();

    ctx.restore();
  }

  function drawBreadboardBase() {
    // 테마 기반 색상 획득
    const isDark = document.documentElement.classList.contains('dark-mode');
    
    // 브래드보드 배경 플라스틱
    ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 8;
    
    ctx.fillStyle = isDark ? '#1e293b' : '#fafafa';
    ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
    ctx.lineWidth = 4;
    
    // 보드 둥근 외곽 그리기
    drawRoundedRect(ctx, BOARD_START_X, BOARD_START_Y, BOARD_WIDTH, BOARD_HEIGHT, 16, true, true);
    
    // 그림자 제거
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 분리선 홈 (e행과 f행 분리 구간)
    ctx.fillStyle = isDark ? '#0f172a' : '#e2e8f0';
    ctx.fillRect(
      BOARD_START_X + 20, 
      BOARD_START_Y + 60 + 4 * PITCH_Y + PITCH_Y/2, 
      BOARD_WIDTH - 40, 
      DIVIDER_GAP - PITCH_Y
    );
  }

  function drawBreadboardHoles() {
    const isDark = document.documentElement.classList.contains('dark-mode');
    
    const labelColor = isDark ? '#94a3b8' : '#334155';
    const holeBorderColor = isDark ? '#475569' : '#94a3b8';
    const holeInnerColor = isDark ? '#0f172a' : '#f1f5f9';

    // 1. 내부 연결선(가이드) 보이기 활성화 시
    if (showInternalWiresCheck.checked) {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.2)';
      
      for (let c = 0; c < COL_COUNT; c++) {
        // 상단 가이드 라인 (a~e)
        const xCoords = BOARD_START_X + 60 + c * PITCH_X;
        const yTopStart = BOARD_START_Y + 60;
        const yTopEnd = BOARD_START_Y + 60 + 4 * PITCH_Y;
        ctx.beginPath();
        ctx.moveTo(xCoords, yTopStart);
        ctx.lineTo(xCoords, yTopEnd);
        ctx.stroke();

        // 하단 가이드 라인 (f~j)
        const yBotStart = BOARD_START_Y + 60 + 5 * PITCH_Y + DIVIDER_GAP;
        const yBotEnd = BOARD_START_Y + 60 + 9 * PITCH_Y + DIVIDER_GAP;
        ctx.beginPath();
        ctx.moveTo(xCoords, yBotStart);
        ctx.lineTo(xCoords, yBotEnd);
        ctx.stroke();
      }
      ctx.restore();
    }



    // 3. 각 핀 구멍 렌더링
    for (let c = 0; c < COL_COUNT; c++) {
      const colNum = 17 - c; // 17번 열부터 1번 열 순
      const hx = BOARD_START_X + 60 + c * PITCH_X;

      // 상/하단 열번호 라벨링
      ctx.fillStyle = labelColor;
      ctx.font = '700 15px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(colNum, hx, BOARD_START_Y + 30);
      ctx.fillText(colNum, hx, BOARD_START_Y + BOARD_HEIGHT - 22);

      for (let r = 0; r < ROW_COUNT; r++) {
        let hy = BOARD_START_Y + 60 + r * PITCH_Y;
        if (r >= 5) {
          hy += DIVIDER_GAP;
        }

        // 좌/우측 알파벳 라벨링 (a~j)
        if (c === 0 || c === COL_COUNT - 1) {
          ctx.fillStyle = r < 5 ? '#ff3b30' : '#007aff'; // a~e행은 빨간 글씨, f~j행은 파란 글씨
          ctx.font = '700 16px Outfit';
          ctx.textAlign = c === 0 ? 'right' : 'left';
          
          const labelX = c === 0 ? BOARD_START_X + 30 : BOARD_START_X + BOARD_WIDTH - 25;
          const letter = String.fromCharCode(97 + r); // a, b, c, d, e, f...
          ctx.fillText(letter, labelX, hy + 5);
        }



        // 단자 구멍 사각형 그리기
        ctx.fillStyle = holeInnerColor;
        ctx.strokeStyle = holeBorderColor;
        ctx.lineWidth = 1.5;
        
        // 핀 내부 메탈 터치 부분
        drawRoundedRect(ctx, hx - 6, hy - 6, 12, 12, 2, true, true);
        
        // 구멍 내부 핀 접속홀 표현
        ctx.fillStyle = isDark ? '#475569' : '#cbd5e1';
        ctx.fillRect(hx - 2, hy - 2, 4, 4);
      }
    }
  }

  function drawComponents() {
    components.forEach(comp => {
      const isSelected = selectedComponent && selectedComponent.id === comp.id;

      if (comp.type === 'battery') {
        drawBattery(comp, isSelected);
      } else if (comp.type === 'wire') {
        drawWire(comp, isSelected);
      } else if (comp.type === 'resistor') {
        drawResistor(comp, isSelected);
      } else if (comp.type === 'led') {
        drawLed(comp, isSelected);
      } else if (comp.type === 'switch') {
        drawSwitch(comp, isSelected);
      }
    });
  }

  function drawBattery(comp, isSelected) {
    const isDark = document.documentElement.classList.contains('dark-mode');
    const posCoords = getHoleCoords(comp.pos.col, comp.pos.row);
    const negCoords = getHoleCoords(comp.neg.col, comp.neg.row);

    // 1. 배터리 본체 그리기
    ctx.save();
    if (isSelected) {
      ctx.shadowColor = 'rgba(37, 99, 235, 0.8)';
      ctx.shadowBlur = 15;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
    }

    // 9V 배터리 몸통 외곽
    ctx.fillStyle = isDark ? '#1e293b' : '#334155';
    ctx.strokeStyle = isDark ? '#3b82f6' : '#0f172a';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, BATTERY_X, BATTERY_Y, BATTERY_W, BATTERY_H, 12, true, true);
    
    // 배터리 머리 부분 단자대
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(BATTERY_X + 25, BATTERY_Y - 14, 25, 14); // 마이너스 단자
    ctx.fillRect(BATTERY_X + BATTERY_W - 50, BATTERY_Y - 14, 25, 14); // 플러스 단자

    // 배터리 엠블럼 레이블
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 18px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('9V BATTERY', BATTERY_X + BATTERY_W/2, BATTERY_Y + 50);

    // 배터리 극성 표시 (+ / -)
    ctx.font = '700 20px Outfit';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('+', BATTERY_X + BATTERY_W - 38, BATTERY_Y + 30);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('-', BATTERY_X + 38, BATTERY_Y + 30);

    ctx.restore();

    // 2. 단자에서 연장된 직선 전선 그리기 (브래드보드를 가리지 않게 우회 경로 설정)
    const p1 = { x: BATTERY_X + BATTERY_W - 37, y: BATTERY_Y - 10 }; // (+) 단자 위치
    const p2 = { x: BATTERY_X + 37, y: BATTERY_Y - 10 };            // (-) 단자 위치

    // 플러스 단자선 (빨강, comp.pos.row를 Y경로 기준으로 전달)
    drawBatteryWire(p1, posCoords, '#ef4444', isSelected, comp.pos.row);

    // 마이너스 단자선 (검정, comp.neg.row를 Y경로 기준으로 전달)
    drawBatteryWire(p2, negCoords, '#1e293b', isSelected, comp.neg.row);
  }

  function drawBatteryWire(p1, p2, color, isSelected, row) {
    ctx.save();
    
    // 배터리 몸체를 우회하는 X좌표 설정 (양극은 배터리 오른쪽(195px), 음극은 배터리 왼쪽(45px))
    const isPositive = (color === '#ef4444');
    const bypassX = isPositive ? (BATTERY_X + BATTERY_W + 15) : (BATTERY_X - 15);

    // 전선 우회 Y좌표 설정 (선이 겹치지 않도록 양극과 음극의 높이를 다르게 설정)
    let routeY;
    if (row < 5) {
      routeY = isPositive ? 110 : 90;
    } else {
      routeY = isPositive ? (BOARD_START_Y + BOARD_HEIGHT + 32) : (BOARD_START_Y + BOARD_HEIGHT + 48);
    }

    // 하이라이트 선택 효과
    if (isSelected) {
      ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p1.x, p1.y - 15);
      ctx.lineTo(bypassX, p1.y - 15);
      ctx.lineTo(bypassX, routeY);
      ctx.lineTo(p2.x, routeY);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // 직선 전선
    ctx.strokeStyle = color;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p1.x, p1.y - 15);
    ctx.lineTo(bypassX, p1.y - 15);
    ctx.lineTo(bypassX, routeY);
    ctx.lineTo(p2.x, routeY);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // 단자 금속 핀
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p2.x, p2.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  function drawWire(comp, isSelected) {
    const c1 = getHoleCoords(comp.from.col, comp.from.row);
    const c2 = getHoleCoords(comp.to.col, comp.to.row);
    
    drawBezierWire(c1, c2, comp.color, isSelected);
  }

  function drawBezierWire(p1, p2, color, isSelected) {
    ctx.save();
    
    // 하이라이트 선택 링
    if (isSelected) {
      ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const cp = getBezierControlPoints(p1, p2);
      ctx.moveTo(p1.x, p1.y);
      ctx.bezierCurveTo(cp.cp1x, cp.cp1y, cp.cp2x, cp.cp2y, p2.x, p2.y);
      ctx.stroke();
    }

    // 본 전선 튜브
    ctx.strokeStyle = color;
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    
    const cp = getBezierControlPoints(p1, p2);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(cp.cp1x, cp.cp1y, cp.cp2x, cp.cp2y, p2.x, p2.y);
    ctx.stroke();

    // 내부 반사광
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 단자 구멍에 꽂힌 핀 금속 대 그리기
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // 전선 곡률 컨트롤포인트 계산
  function getBezierControlPoints(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);

    // 거리에 비례하여 아래쪽으로 휘어지게 컨트롤포인트 배치
    const sag = dist * 0.4;
    return {
      cp1x: p1.x + dx * 0.25,
      cp1y: p1.y + dy * 0.25 + sag,
      cp2x: p1.x + dx * 0.75,
      cp2y: p1.y + dy * 0.75 + sag
    };
  }

  function drawResistor(comp, isSelected) {
    const c1 = getHoleCoords(comp.from.col, comp.from.row);
    const c2 = getHoleCoords(comp.to.col, comp.to.row);
    const midX = (c1.x + c2.x) / 2;
    const midY = (c1.y + c2.y) / 2;

    const angle = Math.atan2(c2.y - c1.y, c2.x - c1.x);
    const len = Math.hypot(c2.x - c1.x, c2.y - c1.y);

    ctx.save();
    ctx.translate(midX, midY);
    ctx.rotate(angle);

    // 선택 시 글로우 하이라이트
    if (isSelected) {
      ctx.shadowColor = 'rgba(37, 99, 235, 0.7)';
      ctx.shadowBlur = 10;
    }

    // 1. 금속 리드선 양끝으로 연결
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-len/2, 0);
    ctx.lineTo(len/2, 0);
    ctx.stroke();

    // 2. 저항기 본체 (베이지 통)
    ctx.fillStyle = '#e2c69f';
    ctx.strokeStyle = '#b5a48b';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, -24, -9, 48, 18, 4, true, true);

    // 3. 저항 색띠 그리기
    // 저항 값에 맞춰 매핑
    let stripes = [];
    if (comp.value === 220) {
      stripes = ['#ef4444', '#ef4444', '#b45309', '#eab308']; // 적, 적, 갈, 금
    } else if (comp.value === 1000) {
      stripes = ['#b45309', '#000000', '#ef4444', '#eab308']; // 갈, 흑, 적, 금
    } else if (comp.value === 10000) {
      stripes = ['#b45309', '#000000', '#f97316', '#eab308']; // 갈, 흑, 황, 금
    }

    const stripeWidth = 4;
    const offsets = [-15, -7, 1, 10]; // 띠 오프셋
    for (let i = 0; i < stripes.length; i++) {
      ctx.fillStyle = stripes[i];
      ctx.fillRect(offsets[i], -9, stripeWidth, 18);
    }

    ctx.restore();
  }

  function drawLed(comp, isSelected) {
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
    if (!path) return [];
    
    const battery = components.find(c => c.type === 'battery');
    if (!battery) return [];
    
    // 배터리 단자 및 전선 우회 좌표 설정
    const batPosCoords = { x: BATTERY_X + BATTERY_W - 37, y: BATTERY_Y - 10 };
    const batNegCoords = { x: BATTERY_X + 37, y: BATTERY_Y - 10 };
    
    const posHoleCoords = getHoleCoords(battery.pos.col, battery.pos.row);
    const negHoleCoords = getHoleCoords(battery.neg.col, battery.neg.row);
    
    const posRouteY = battery.pos.row < 5 ? 110 : BOARD_START_Y + BOARD_HEIGHT + 32;
    const negRouteY = battery.neg.row < 5 ? 90 : BOARD_START_Y + BOARD_HEIGHT + 48;
    
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
          
          // 점퍼선 실제 렌더링(Cubic Bezier) 경로와 100% 일치하도록 보간 세그먼트 생성
          const p1 = getHoleCoords(startPin.col, startPin.row);
          const p2 = getHoleCoords(endPin.col, endPin.row);
          
          const cp = getBezierControlPoints(p1, p2);
          
          // 베지어 곡선을 따라 10개의 제어점(세그먼트) 생성하여 곡선 흐름 완벽 구현
          for (let i = 1; i < 10; i++) {
            const t = i / 10;
            const u = 1 - t;
            // drawBezierWire와 동일한 2개의 제어점을 사용하는 Cubic Bezier 공식
            const x = u*u*u * p1.x + 3 * u*u * t * cp.cp1x + 3 * u * t*t * cp.cp2x + t*t*t * p2.x;
            const y = u*u*u * p1.y + 3 * u*u * t * cp.cp1y + 3 * u * t*t * cp.cp2y + t*t*t * p2.y;
            coords.push({ x, y });
          }
          
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

      // 이동 속도 조절 (슬라이더 반영)
      const baseSpeed = 0.00003; 
      const speed = baseSpeed * currentSpeedMultiplier; 
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
  }
  // ==========================================================================
  // 14. 판서(필기) 레이어 드로잉
  // ==========================================================================
  function drawStrokes() {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    drawings.forEach(stroke => {
      if (stroke.points.length < 2) return;
      
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });

    ctx.restore();
  }

  // ==========================================================================
  // 15. 부품 신규 배치 실시간 미리보기 렌더링
  // ==========================================================================
  function drawPlacementPreview() {
    if (!placementStartHole || !placementCurrentPos || drawMode) return;

    const p1 = getHoleCoords(placementStartHole.col, placementStartHole.row);
    // 마우스가 다른 구멍 위에 스냅되면 해당 격자 좌표로 렌더링, 공중이면 자유 좌표
    let p2 = null;
    if (placementCurrentPos.col !== undefined) {
      p2 = getHoleCoords(placementCurrentPos.col, placementCurrentPos.row);
    } else {
      p2 = placementCurrentPos; // {x, y}
    }

    ctx.save();
    ctx.globalAlpha = 0.55;

    // 드래그 중인 툴 타입에 따라 실시간 렌더링 가이드 제공
    if (activeTool === 'wire') {
      ctx.strokeStyle = activeWireColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    } else if (activeTool === 'resistor') {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.fillStyle = '#e2c69f';
      ctx.fillRect(midX - 16, midY - 6, 32, 12);
    } else if (activeTool === 'led') {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.fillStyle = activeLedColor === 'red' ? '#ef4444' : activeLedColor === 'green' ? '#34c759' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(midX, midY - 4, 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (activeTool === 'switch') {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.fillStyle = '#475569';
      ctx.fillRect(midX - 14, midY - 6, 28, 12);
    } else if (activeTool === 'battery') {
      // 첫 구멍 탭했을 때는 positive 단자 꽂은 걸로 표현
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 8, 0, Math.PI*2);
      ctx.fill();
      
      // 두 번째 터치 대기 가이드선
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ==========================================================================
  // 16. 유틸리티 함수 (둥근 사각형 등)
  // ==========================================================================
  function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof radius === 'undefined') {
      radius = 5;
    }
    if (typeof radius === 'number') {
      radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } else {
      var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
      for (var side in defaultRadius) {
        radius[side] = radius[side] || defaultRadius[side];
      }
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) {
      ctx.fill();
    }
    if (stroke) {
      ctx.stroke();
    }
  }

  // ==========================================================================
  // 17. 앱 실행 개시
  // ==========================================================================
  initTheme();
  resizeCanvas();
  fitToScreen();
  setExperiment('free');
  animLoop(); // 애니메이션 루프 시작
})();
