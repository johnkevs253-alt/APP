document.addEventListener("DOMContentLoaded", () => {
    const studentRows = document.getElementById("studentRows");
    const addStudentBtn = document.getElementById("addStudentBtn");
    const exportCsvBtn = document.getElementById("exportCsvBtn");
    const exportConfigBtn = document.getElementById("exportConfigBtn");
    const importConfigBtn = document.getElementById("importConfigBtn");
    const loginBtn = document.getElementById("loginBtn");
    const loginText = document.getElementById("loginText");
    const loginModal = document.getElementById("loginModal");
    const submitLoginBtn = document.getElementById("submitLoginBtn");
    const googleEmail = document.getElementById("googleEmail");

    const passingGradeEl = document.getElementById("passingGrade");
    const weightActivityEl = document.getElementById("weightActivity");
    const weightQuizEl = document.getElementById("weightQuiz");
    const weightWrittenEl = document.getElementById("weightWritten");
    const weightPerformanceEl = document.getElementById("weightPerformance");
    const weightTestEl = document.getElementById("weightTest");
    
    const addActBtn = document.getElementById("addActBtn");
    const addQzBtn = document.getElementById("addQzBtn");
    const addWWBtn = document.getElementById("addWWBtn");
    const addPTBtn = document.getElementById("addPTBtn");

    const actMaxContainer = document.getElementById("actMaxContainer");
    const qzMaxContainer = document.getElementById("qzMaxContainer");
    const wwMaxContainer = document.getElementById("wwMaxContainer");
    const ptMaxContainer = document.getElementById("ptMaxContainer");

    const thAct = document.getElementById("thAct");
    const thQuiz = document.getElementById("thQuiz");
    const thWritten = document.getElementById("thWritten");
    const thPerf = document.getElementById("thPerf");
    const maxQaEl = document.querySelector('.max-qa');
    
    let actCount = 0, qzCount = 0, wwCount = 0, ptCount = 0;
    
    // Application Data state
    let appData = {
        activeSection: 'default',
        sections: {
            'default': { name: 'Default Section', state: null }
        }
    };
    let currentSectionId = 'default';
    let saveTimeout = null;

    // --- Section Management ---
    const secSelect = document.getElementById('sectionSelect');

    function populateSectionDropdown() {
        if (!secSelect) return;
        secSelect.innerHTML = '';
        for (let id in appData.sections) {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = appData.sections[id].name;
            if (id === appData.activeSection) opt.selected = true;
            secSelect.appendChild(opt);
        }
    }

    if (secSelect) {
        secSelect.addEventListener('change', (e) => {
            switchSection(e.target.value);
        });
    }

    const addSecBtn = document.getElementById('addSectionBtn');
    if (addSecBtn) {
        addSecBtn.addEventListener('click', () => {
            const name = prompt("Enter new section name:");
            if (name && name.trim()) {
                const id = 'sec_' + Date.now();
                appData.sections[id] = { name: name.trim(), state: null };
                populateSectionDropdown();
                secSelect.value = id;
                switchSection(id);
            }
        });
    }

    const renameSecBtn = document.getElementById('renameSectionBtn');
    if (renameSecBtn) {
        renameSecBtn.addEventListener('click', () => {
            const currName = appData.sections[currentSectionId].name;
            const name = prompt("Rename section:", currName);
            if (name && name.trim()) {
                appData.sections[currentSectionId].name = name.trim();
                populateSectionDropdown();
                triggerSave(); // Persist rename
            }
        });
    }

    const deleteSecBtn = document.getElementById('deleteSectionBtn');
    if (deleteSecBtn) {
        deleteSecBtn.addEventListener('click', () => {
            if (Object.keys(appData.sections).length <= 1) {
                alert("You must have at least one section. Cannot delete.");
                return;
            }
            if (confirm(`Are you sure you want to delete '${appData.sections[currentSectionId].name}'?\nAll data in this section will be lost forever.`)) {
                delete appData.sections[currentSectionId];
                appData.activeSection = Object.keys(appData.sections)[0];
                populateSectionDropdown();
                switchSection(appData.activeSection);
            }
        });
    }

    function switchSection(sectionId) {
        appData.activeSection = sectionId;
        currentSectionId = sectionId;
        
        // Clear UI containers entirely
        actCount = 0; qzCount = 0; wwCount = 0; ptCount = 0;
        if(actMaxContainer) actMaxContainer.innerHTML = ''; 
        if(qzMaxContainer) qzMaxContainer.innerHTML = ''; 
        if(wwMaxContainer) wwMaxContainer.innerHTML = ''; 
        if(ptMaxContainer) ptMaxContainer.innerHTML = '';
        document.querySelectorAll('.act-header, .qz-header, .ww-header, .pt-header').forEach(el => el.remove());
        if(thAct) thAct.colSpan = 3; 
        if(thQuiz) thQuiz.colSpan = 3; 
        if(thWritten) thWritten.colSpan = 3; 
        if(thPerf) thPerf.colSpan = 3;
        if(studentRows) studentRows.innerHTML = '';

        const secData = appData.sections[sectionId];
        if (secData && secData.state) {
            const data = secData.state;
            if (passingGradeEl) passingGradeEl.value = data.weights?.passingGrade || 80;
            if (weightActivityEl) weightActivityEl.value = data.weights?.activity || 10;
            if (weightQuizEl) weightQuizEl.value = data.weights?.quiz || 10;
            if (weightWrittenEl) weightWrittenEl.value = data.weights?.written || 10;
            if (weightPerformanceEl) weightPerformanceEl.value = data.weights?.perf || 50;
            if (weightTestEl) weightTestEl.value = data.weights?.test || 20;
            if (maxQaEl) maxQaEl.value = data.maxScores?.qa || 50;

            (data.maxScores?.act || []).forEach(v => addColumn('act', v));
            (data.maxScores?.qz || []).forEach(v => addColumn('qz', v));
            (data.maxScores?.ww || []).forEach(v => addColumn('ww', v));
            (data.maxScores?.pt || []).forEach(v => addColumn('pt', v));

            (data.students || []).forEach(st => addNewStudentRow(st));
        } else {
            // Default blank slate for a brand new section
            if (passingGradeEl) passingGradeEl.value = 80;
            if (weightActivityEl) weightActivityEl.value = 10;
            if (weightQuizEl) weightQuizEl.value = 10;
            if (weightWrittenEl) weightWrittenEl.value = 10;
            if (weightPerformanceEl) weightPerformanceEl.value = 50;
            if (weightTestEl) weightTestEl.value = 20;
            if (maxQaEl) maxQaEl.value = 50;

            addColumn('act', 50); addColumn('qz', 50); addColumn('ww', 50); addColumn('pt', 50);
            addNewStudentRow();
        }
        recalculateAll();
        // Immediately persist the switch so active section remembers next reload
        localStorage.setItem('gradeCalculatorData_v2', JSON.stringify(appData));
    }

    // --- Save State ---
    function triggerSave() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveState, 500);
    }

    function saveState() {
        if(!studentRows) return;
        const data = {
            weights: {
                passingGrade: passingGradeEl?.value || 80,
                activity: weightActivityEl?.value || 10,
                quiz: weightQuizEl?.value || 10,
                written: weightWrittenEl?.value || 10,
                perf: weightPerformanceEl?.value || 50,
                test: weightTestEl?.value || 20
            },
            maxScores: {
                act: Array.from(document.querySelectorAll('.max-act')).map(el => el.value),
                qz: Array.from(document.querySelectorAll('.max-qz')).map(el => el.value),
                ww: Array.from(document.querySelectorAll('.max-ww')).map(el => el.value),
                pt: Array.from(document.querySelectorAll('.max-pt')).map(el => el.value),
                qa: maxQaEl?.value || 50
            },
            students: Array.from(studentRows.querySelectorAll('tr')).map(tr => ({
                name: tr.querySelector('.student-name').value,
                scores: {
                    act: Array.from(tr.querySelectorAll('.act-score')).map(el => el.value),
                    qz: Array.from(tr.querySelectorAll('.qz-score')).map(el => el.value),
                    ww: Array.from(tr.querySelectorAll('.ww-score')).map(el => el.value),
                    pt: Array.from(tr.querySelectorAll('.pt-score')).map(el => el.value),
                    qa: tr.querySelector('.test-score').value
                }
            }))
        };
        appData.sections[currentSectionId].state = data;
        localStorage.setItem('gradeCalculatorData_v2', JSON.stringify(appData));
    }

    // --- Attach Events ---
    [passingGradeEl, weightActivityEl, weightQuizEl, weightWrittenEl, weightPerformanceEl, weightTestEl, maxQaEl].forEach(el => {
        if(el) el.addEventListener("input", recalculateAll);
    });

    if(addStudentBtn) addStudentBtn.addEventListener("click", () => addNewStudentRow());
    if(exportCsvBtn) exportCsvBtn.addEventListener("click", exportToCsv);
    if(addActBtn) addActBtn.addEventListener("click", () => addColumn('act'));
    if(addQzBtn) addQzBtn.addEventListener("click", () => addColumn('qz'));
    if(addWWBtn) addWWBtn.addEventListener("click", () => addColumn('ww'));
    if(addPTBtn) addPTBtn.addEventListener("click", () => addColumn('pt'));

    // --- Import / Export ---
    if(exportConfigBtn) {
        exportConfigBtn.addEventListener("click", () => {
            saveState(); // Ensure latest state
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", "GradeCalculator_Backup.json");
            dlAnchorElem.click();
        });
    }

    if(importConfigBtn) {
        importConfigBtn.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    if (imported && imported.sections) {
                        appData = imported;
                        if (!appData.sections[appData.activeSection]) appData.activeSection = Object.keys(appData.sections)[0];
                        localStorage.setItem('gradeCalculatorData_v2', JSON.stringify(appData));
                        populateSectionDropdown();
                        switchSection(appData.activeSection);
                        alert("Data imported successfully!");
                    } else {
                        alert("Invalid configuration file format.");
                    }
                } catch(err) {
                    alert("Error reading JSON file.");
                }
            };
            reader.readAsText(file);
            importConfigBtn.value = ''; // Reset
        });
    }

    // --- Login Modal Logic ---
    if(loginBtn) {
        loginBtn.addEventListener("click", () => {
            loginModal.style.display = "flex";
        });
    }

    const closeBtn = document.querySelector('.close-modal');
    if(closeBtn) {
        closeBtn.addEventListener("click", () => {
            loginModal.style.display = "none";
        });
    }

    if(submitLoginBtn) {
        submitLoginBtn.addEventListener("click", () => {
            const email = googleEmail.value.trim();
            if(email) {
                appData.userEmail = email; // Store user ID
                localStorage.setItem('gradeCalculatorData_v2', JSON.stringify(appData));
                loginText.textContent = email;
                loginModal.style.display = "none";
                alert(`Welcome back, ${email}!`);
            }
        });
    }

    function removeColumn(type, idx) {
        if(!confirm("Are you sure you want to remove this column? Student scores in this column will be deleted.")) return;
        saveState(); // Ensure DOM changes are synced to appData
        
        const data = appData.sections[currentSectionId].state;
        if(data && data.maxScores && data.maxScores[type]) {
            data.maxScores[type].splice(idx, 1);
        }
        if(data && data.students) {
            data.students.forEach(st => {
                if(st.scores && st.scores[type]) {
                    st.scores[type].splice(idx, 1);
                }
            });
        }
        localStorage.setItem('gradeCalculatorData_v2', JSON.stringify(appData));
        switchSection(currentSectionId);
    }

    // --- Initialization ---
    function init() {
        // Try migrating V1 data to V2 transparently if v2 doesn't exist but v1 does
        const jsonV2 = localStorage.getItem('gradeCalculatorData_v2');
        const jsonV1 = localStorage.getItem('gradeCalculatorData');
        
        if (jsonV2) {
            try {
                appData = JSON.parse(jsonV2);
                if (!appData.sections || Object.keys(appData.sections).length === 0) throw new Error("Invalid structure");
                if (!appData.sections[appData.activeSection]) appData.activeSection = Object.keys(appData.sections)[0];
            } catch(e) {
                console.error("Failed to recover V2 data", e);
                appData = { activeSection: 'default', sections: { 'default': { name: 'Default Section', state: null } } };
            }
        } else if (jsonV1) {
            try {
                // Migrate
                const oldData = JSON.parse(jsonV1);
                appData.sections['default'].state = oldData;
            } catch(e) {}
        }
        
        if(appData.userEmail && loginText) {
            loginText.textContent = appData.userEmail;
        }

        populateSectionDropdown();
        switchSection(appData.activeSection);
    }

    function addColumn(type, initialValue = 50) {
        let countVar, prefixLabel, pClass, container, totalThClass, newThClass, thElement, totalTdClass, scoreClass;

        if (type === 'act') {
            actCount++; countVar = actCount; prefixLabel = 'Act'; pClass = 'max-act'; container = actMaxContainer;
            totalThClass = '.th-act-total'; newThClass = 'act-header'; thElement = thAct; totalTdClass = '.td-act-total'; scoreClass = 'act-score';
        } else if (type === 'qz') {
            qzCount++; countVar = qzCount; prefixLabel = 'Qz'; pClass = 'max-qz'; container = qzMaxContainer;
            totalThClass = '.th-qz-total'; newThClass = 'qz-header'; thElement = thQuiz; totalTdClass = '.td-qz-total'; scoreClass = 'qz-score';
        } else if (type === 'ww') {
            wwCount++; countVar = wwCount; prefixLabel = 'WW'; pClass = 'max-ww'; container = wwMaxContainer;
            totalThClass = '.th-ww-total'; newThClass = 'ww-header'; thElement = thWritten; totalTdClass = '.td-ww-total'; scoreClass = 'ww-score';
        } else if (type === 'pt') {
            ptCount++; countVar = ptCount; prefixLabel = 'PT'; pClass = 'max-pt'; container = ptMaxContainer;
            totalThClass = '.th-pt-total'; newThClass = 'pt-header'; thElement = thPerf; totalTdClass = '.td-pt-total'; scoreClass = 'pt-score';
        }

        const maxGroup = document.createElement("div");
        maxGroup.className = "max-input-group";
        maxGroup.innerHTML = `<span>${prefixLabel} ${countVar}:</span><input type="number" class="global-input ${pClass}" value="${initialValue}" min="1"><button class="delete-col-btn" title="Remove Column"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>`;
        maxGroup.querySelector('input').addEventListener("input", recalculateAll);
        
        if(container) {
            maxGroup.querySelector('.delete-col-btn').addEventListener("click", function() {
                const children = Array.from(container.children);
                const idx = children.indexOf(maxGroup);
                removeColumn(type, idx);
            });
            container.appendChild(maxGroup);
        }

        const totalTh = document.querySelector(totalThClass);
        if(totalTh) {
            const newTh = document.createElement('th');
            newTh.className = newThClass;
            newTh.textContent = `${prefixLabel} ${countVar}`;
            totalTh.parentNode.insertBefore(newTh, totalTh);
        }
        
        if(thElement) thElement.colSpan = countVar + 3;

        if(studentRows) {
            const rows = studentRows.querySelectorAll("tr");
            rows.forEach(tr => {
                const totalTd = tr.querySelector(totalTdClass);
                const newTd = document.createElement("td");
                // Changed input type to text for Excused support
                newTd.innerHTML = `<input type="text" inputmode="text" class="student-score ${scoreClass}" value="0">`;
                const inputEl = newTd.querySelector('input');
                
                // Re-select upon click to easily replace '0'
                inputEl.addEventListener('focus', () => { if(inputEl.value === '0') inputEl.select(); });
                inputEl.addEventListener("input", () => calculateRow(tr));
                totalTd.parentNode.insertBefore(newTd, totalTd);
            });
        }
        
        recalculateAll();
    }
    
    function addNewStudentRow(studentData = null) {
        const tr = document.createElement("tr");

        let actHtml = ""; for(let i=0; i<actCount; i++) actHtml += `<td><input type="text" inputmode="text" class="student-score act-score" value="0"></td>`;
        let qzHtml = ""; for(let i=0; i<qzCount; i++) qzHtml += `<td><input type="text" inputmode="text" class="student-score qz-score" value="0"></td>`;
        let wwHtml = ""; for(let i=0; i<wwCount; i++) wwHtml += `<td><input type="text" inputmode="text" class="student-score ww-score" value="0"></td>`;
        let ptHtml = ""; for(let i=0; i<ptCount; i++) ptHtml += `<td><input type="text" inputmode="text" class="student-score pt-score" value="0"></td>`;

        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button class="delete-btn" title="Remove Student"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                    <input type="text" placeholder="Last Name, First Name" class="student-name">
                </div>
            </td>
            <!-- Activities -->
            ${actHtml}
            <td class="td-act-total read-only total-col">0</td>
            <td class="act-ps read-only">0.00</td>
            <td class="act-ws read-only">0.00</td>
            <!-- Quizzes -->
            ${qzHtml}
            <td class="td-qz-total read-only total-col">0</td>
            <td class="qz-ps read-only">0.00</td>
            <td class="qz-ws read-only">0.00</td>
            <!-- Written -->
            ${wwHtml}
            <td class="td-ww-total read-only total-col">0</td>
            <td class="written-ps read-only">0.00</td>
            <td class="written-ws read-only">0.00</td>
            <!-- Performance -->
            ${ptHtml}
            <td class="td-pt-total read-only total-col">0</td>
            <td class="perf-ps read-only">0.00</td>
            <td class="perf-ws read-only">0.00</td>
            <!-- Unit Test -->
            <td><input type="text" inputmode="text" class="student-score test-score" value="0"></td>
            <td class="test-ps read-only">0.00</td>
            <td class="test-ws read-only">0.00</td>
            <!-- Total -->
            <td class="final-grade read-only">0.00</td>
        `;

        if (studentData) {
            tr.querySelector('.student-name').value = studentData.name || '';
            tr.querySelectorAll('.act-score').forEach((el, i) => el.value = studentData.scores?.act?.[i] !== undefined ? studentData.scores.act[i] : '0');
            tr.querySelectorAll('.qz-score').forEach((el, i) => el.value = studentData.scores?.qz?.[i] !== undefined ? studentData.scores.qz[i] : '0');
            tr.querySelectorAll('.ww-score').forEach((el, i) => el.value = studentData.scores?.ww?.[i] !== undefined ? studentData.scores.ww[i] : '0');
            tr.querySelectorAll('.pt-score').forEach((el, i) => el.value = studentData.scores?.pt?.[i] !== undefined ? studentData.scores.pt[i] : '0');
            const ts = tr.querySelector('.test-score');
            if(ts && studentData.scores) ts.value = studentData.scores.qa !== undefined ? studentData.scores.qa : '0';
        }

        const nameInput = tr.querySelector('.student-name');
        if (nameInput) nameInput.addEventListener('input', triggerSave);

        const scoreInputs = tr.querySelectorAll('.student-score');
        scoreInputs.forEach(input => {
            input.addEventListener('focus', () => { if(input.value === '0') input.select(); });
            input.addEventListener('input', () => calculateRow(tr));
        });

        const delBtn = tr.querySelector('.delete-btn');
        delBtn.addEventListener('click', () => {
            tr.remove();
            recalculateAll();
        });

        if(studentRows) studentRows.appendChild(tr);
        calculateRow(tr);
    }

    // --- Calculation Logic (Excused-Aware) ---
    function calculateSection(tr, maxClass, scoreClass, totalTdClass, psClass, wsClass, weightEl) {
        const maxInputs = Array.from(document.querySelectorAll(maxClass));
        const scoreInputs = Array.from(tr.querySelectorAll(scoreClass));
        const passPercent = (parseFloat(passingGradeEl?.value) || 80) / 100;
        
        let studentTotalMax = 0;
        let studentScore = 0;

        scoreInputs.forEach((inp, i) => {
            const valStr = inp.value.trim().toUpperCase();
            const maxVal = parseFloat(maxInputs[i]?.value) || 0;
            
            if (valStr === 'E' || valStr === 'EX' || valStr === 'EXCUSED') {
                inp.classList.add('excused-input');
                studentTotalMax += maxVal;
                studentScore += maxVal * passPercent;
            } else {
                inp.classList.remove('excused-input');
                studentTotalMax += maxVal;
                studentScore += (parseFloat(valStr) || 0);
            }
        });

        const divMax = studentTotalMax || 1; 
        const weight = (parseFloat(weightEl?.value) || 0) / 100;

        const totalTd = tr.querySelector(totalTdClass);
        if(totalTd) totalTd.textContent = studentScore;

        const ps = (studentScore / divMax) * 100;
        const ws = ps * weight;

        const psEl = tr.querySelector(psClass);
        if(psEl) psEl.textContent = (studentTotalMax === 0 && studentScore === 0 ? 0 : Math.min(Math.max(ps, 0), 100)).toFixed(2);
        const wsEl = tr.querySelector(wsClass);
        if(wsEl) wsEl.textContent = (studentTotalMax === 0 && studentScore === 0 ? 0 : Math.min(Math.max(ws, 0), weight * 100)).toFixed(2);

        return (studentTotalMax === 0 && studentScore === 0 ? 0 : ws);
    }

    function calculateTestRow(tr) {
        const inp = tr.querySelector('.test-score');
        if(!inp) return 0;
        const valStr = inp.value.trim().toUpperCase();
        const maxVal = parseFloat(maxQaEl?.value) || 0;
        const passPercent = (parseFloat(passingGradeEl?.value) || 80) / 100;
        
        let studentTotalMax = 0;
        let studentScore = 0;

        if (valStr === 'E' || valStr === 'EX' || valStr === 'EXCUSED') {
            inp.classList.add('excused-input');
            studentTotalMax = maxVal;
            studentScore = maxVal * passPercent;
        } else {
            inp.classList.remove('excused-input');
            studentTotalMax = maxVal;
            studentScore = (parseFloat(valStr) || 0);
        }

        let divMax = studentTotalMax || 1;
        const weightT = (parseFloat(weightTestEl?.value) || 0) / 100;
        
        const psT = (studentScore / divMax) * 100;
        const wsT = psT * weightT;

        const psEl = tr.querySelector('.test-ps');
        if(psEl) psEl.textContent = (studentTotalMax === 0 && studentScore === 0 ? 0 : Math.min(Math.max(psT, 0), 100)).toFixed(2);
        
        const wsEl = tr.querySelector('.test-ws');
        if(wsEl) wsEl.textContent = (studentTotalMax === 0 && studentScore === 0 ? 0 : Math.min(Math.max(wsT, 0), weightT * 100)).toFixed(2);

        return (studentTotalMax === 0 && studentScore === 0 ? 0 : wsT);
    }

    function calculateRow(tr) {
        const wsAct = calculateSection(tr, '.max-act', '.act-score', '.td-act-total', '.act-ps', '.act-ws', weightActivityEl);
        const wsQz = calculateSection(tr, '.max-qz', '.qz-score', '.td-qz-total', '.qz-ps', '.qz-ws', weightQuizEl);
        const wsW = calculateSection(tr, '.max-ww', '.ww-score', '.td-ww-total', '.written-ps', '.written-ws', weightWrittenEl);
        const wsP = calculateSection(tr, '.max-pt', '.pt-score', '.td-pt-total', '.perf-ps', '.perf-ws', weightPerformanceEl);
        const wsT = calculateTestRow(tr);

        const initialGrade = wsAct + wsQz + wsW + wsP + wsT;
        const fnlBtn = tr.querySelector('.final-grade');
        if(fnlBtn) fnlBtn.textContent = Math.min(Math.max(initialGrade, 0), 100).toFixed(2);
        
        triggerSave();
    }

    function recalculateAll() {
        if(!studentRows) return;
        const rows = studentRows.querySelectorAll('tr');
        rows.forEach(row => calculateRow(row));
    }

    // --- Export Logic ---
    function exportToCsv() {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        let headers = ["Learner's Name"];
        
        for(let i=1; i<=actCount; i++) headers.push(`Act ${i}`);
        headers.push("Act Total", "Act PS", "Act WS");

        for(let i=1; i<=qzCount; i++) headers.push(`Qz ${i}`);
        headers.push("Qz Total", "Qz PS", "Qz WS");

        for(let i=1; i<=wwCount; i++) headers.push(`WW ${i}`);
        headers.push("WW Total", "Written PS", "Written WS");

        for(let i=1; i<=ptCount; i++) headers.push(`PT ${i}`);
        headers.push("PT Total", "Performance PS", "Performance WS");

        headers.push("Unit Test Score", "Unit Test PS", "Unit Test WS", "Initial Grade");
        
        csvContent += headers.map(h => `"${h}"`).join(',') + "\n";
        
        const rows = studentRows.querySelectorAll('tr');
        rows.forEach(row => {
            const name = row.querySelector('.student-name').value || "Unnamed Student";
            let rowData = [`"${name.replace(/"/g, '""')}"`];
            
            row.querySelectorAll('.act-score').forEach(inp => rowData.push(inp.value.trim() === '' ? '0' : `"${inp.value.trim()}"`));
            rowData.push(row.querySelector('.td-act-total').textContent, row.querySelector('.act-ps').textContent, row.querySelector('.act-ws').textContent);

            row.querySelectorAll('.qz-score').forEach(inp => rowData.push(inp.value.trim() === '' ? '0' : `"${inp.value.trim()}"`));
            rowData.push(row.querySelector('.td-qz-total').textContent, row.querySelector('.qz-ps').textContent, row.querySelector('.qz-ws').textContent);

            row.querySelectorAll('.ww-score').forEach(inp => rowData.push(inp.value.trim() === '' ? '0' : `"${inp.value.trim()}"`));
            rowData.push(row.querySelector('.td-ww-total').textContent, row.querySelector('.written-ps').textContent, row.querySelector('.written-ws').textContent);

            row.querySelectorAll('.pt-score').forEach(inp => rowData.push(inp.value.trim() === '' ? '0' : `"${inp.value.trim()}"`));
            rowData.push(row.querySelector('.td-pt-total').textContent, row.querySelector('.perf-ps').textContent, row.querySelector('.perf-ws').textContent);

            const testInp = row.querySelector('.test-score');
            rowData.push(testInp.value.trim() === '' ? '0' : `"${testInp.value.trim()}"`, row.querySelector('.test-ps').textContent, row.querySelector('.test-ws').textContent, row.querySelector('.final-grade').textContent);

            csvContent += rowData.join(',') + "\n";
        });

        const activeSecName = appData.sections[currentSectionId].name.replace(/[^a-z0-9]/gi, '_');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Grades_${activeSecName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    init(); // Fire application
});
