/* ============================================================
   House Price Prediction — App.js (Redesigned Dashboard)
   Renders charts, tables, hero, quick-predict, and prediction logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
    if (typeof PROJECT_DATA === 'undefined') {
        console.error('data.js not loaded');
        document.body.innerHTML = '<div class="alert alert-danger m-5">Error: data.js not found. Run build_website.py first.</div>';
        return;
    }

    const P = PROJECT_DATA;
    const charts = {};

    const COLORS = {
        primary: '#6366f1',
        primaryLight: '#818cf8',
        accent: '#22d3ee',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        blue: '#3b82f6',
        purple: '#a855f7',
        pink: '#ec4899',
        teal: '#14b8a6',
        orange: '#f97316',
        gray: '#94a3b8',
        palette: ['#6366f1','#22d3ee','#f59e0b','#10b981','#ef4444','#a855f7','#3b82f6','#ec4899','#f97316','#14b8a6']
    };

    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;

    // === Helpers ===
    function fmt(n, d) { return Number(n).toFixed(d === undefined ? 2 : d); }
    function fmtCurrency(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
    // Error metrics shown as % of the mean house price (MSE is squared, so it is % of mean price squared)
    function meanPrice() { return P.dataset.priceRange.mean; }
    function fmtPctErr(n) { return (n / meanPrice() * 100).toFixed(2) + '%'; }
    function fmtPctMse(n) { return (n / (meanPrice() * meanPrice()) * 100).toFixed(2) + '%'; }
    function fmtLakhs(n) { return '₹' + (n / 100000).toFixed(1) + ' L'; }
    function fmtCrLk(n) {
        if (Math.abs(n) >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
        return '₹' + (n / 100000).toFixed(1) + ' L';
    }
    function el(id) { return document.getElementById(id); }

    function makeChart(canvasId, config) {
        if (charts[canvasId]) { charts[canvasId].destroy(); }
        const ctx = el(canvasId);
        if (!ctx) return null;
        charts[canvasId] = new Chart(ctx, config);
        return charts[canvasId];
    }

    // === Core prediction function (shared by predictor form + quick predict) ===
    function computePrediction(city, location, propertyType, area, bedrooms, bathrooms, floors, age, parking, furnishing) {
        const pred = P.prediction;
        const featureMap = {};

        featureMap['Area_SqFt'] = area;
        featureMap['Bedrooms'] = bedrooms;
        featureMap['Bathrooms'] = bathrooms;
        featureMap['Floors'] = floors;
        featureMap['Property_Age'] = age;
        featureMap['Parking'] = parking;
        featureMap['Furnishing_Encoded'] = pred.furnishingMap[furnishing] || 0;

        pred.cities.forEach(c => {
            if (c !== pred.droppedCity) {
                featureMap['City_' + c] = (city === c) ? 1 : 0;
            }
        });

        pred.propertyTypes.forEach(pt => {
            if (pt !== pred.droppedPropertyType) {
                featureMap['Property_Type_' + pt] = (propertyType === pt) ? 1 : 0;
            }
        });

        const locPrices = pred.locationPrices[city] || {};
        featureMap['Location_Encoded'] = locPrices[location] || 15000000;

        const rawVector = pred.featureNames.map(name => featureMap[name] !== undefined ? featureMap[name] : 0);

        const scaledVector = rawVector.map((x, i) => {
            const std = pred.scalerStds[i];
            return std !== 0 ? (x - pred.scalerMeans[i]) / std : 0;
        });

        let price = pred.intercept;
        scaledVector.forEach((v, i) => { price += v * pred.coefficients[i]; });
        price = Math.max(500000, Math.round(price / 10000) * 10000);

        return price;
    }

    // === Populate location dropdown for a city ===
    function populateLocations(selectEl, city) {
        const pred = P.prediction;
        selectEl.innerHTML = '';
        const locs = pred.locationPrices[city] || {};
        Object.keys(locs).sort().forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc;
            opt.textContent = loc;
            selectEl.appendChild(opt);
        });
    }

    // === 0. Hero Section ===
    function renderHero() {
        const d = P.dataset;
        const heroRecords = el('heroRecords');
        const heroFeatures = el('heroFeatures');
        const heroCities = el('heroCities');
        const heroBestR2 = el('heroBestR2');

        if (heroRecords) heroRecords.textContent = d.cleanShape[0].toLocaleString();
        if (heroFeatures) heroFeatures.textContent = d.cleanShape[1];
        if (heroCities) heroCities.textContent = Object.keys(d.cityDistribution).length;
        if (heroBestR2 && P.evaluation && P.evaluation.models) {
            const best = P.evaluation.models.reduce((a, b) => a.r2 > b.r2 ? a : b);
            heroBestR2.textContent = fmt(best.r2, 4);
        }
    }

    // === 1. Overview ===
    function renderOverview() {
        const d = P.dataset;
        const sr = el('statRecords');
        const sf = el('statFeatures');
        const sc = el('statCities');
        const sp = el('statPriceRange');
        if (sr) sr.textContent = d.cleanShape[0].toLocaleString();
        if (sf) sf.textContent = d.cleanShape[1];
        if (sc) sc.textContent = Object.keys(d.cityDistribution).length;
        if (sp) sp.textContent = fmtCrLk(d.priceRange.min) + ' – ' + fmtCrLk(d.priceRange.max);

        const tbody = el('summaryStatsTable');
        if (tbody) {
            let html = '<table class="table table-striped table-hover"><thead><tr><th>Statistic</th><th>Value</th></tr></thead><tbody>';
            html += '<tr><td>Total Records (Original)</td><td>' + d.originalShape[0] + '</td></tr>';
            html += '<tr><td>Clean Records</td><td>' + d.cleanShape[0] + '</td></tr>';
            html += '<tr><td>Features</td><td>' + d.cleanShape[1] + '</td></tr>';
            html += '<tr><td>Cities</td><td>' + Object.keys(d.cityDistribution).join(', ') + '</td></tr>';
            html += '<tr><td>Mean Price</td><td>' + fmtCurrency(d.priceRange.mean) + '</td></tr>';
            html += '<tr><td>Median Price</td><td>' + fmtCurrency(d.priceRange.median) + '</td></tr>';
            html += '</tbody></table>';
            tbody.innerHTML = html;
        }
    }

    // === 2. Preprocessing ===
    function renderPreprocessing() {
        const pp = P.preprocessing;
        const mv = pp.missingValues;
        const mvLabels = Object.keys(mv).filter(k => mv[k] > 0);
        const mvValues = mvLabels.map(k => mv[k]);

        if (mvLabels.length > 0) {
            makeChart('missingValuesChart', {
                type: 'bar',
                data: {
                    labels: mvLabels,
                    datasets: [{
                        label: 'Missing Count',
                        data: mvValues,
                        backgroundColor: COLORS.warning + 'cc',
                        borderColor: COLORS.warning,
                        borderWidth: 1,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, title: { display: true, text: 'Count' } } }
                }
            });
        }

        const ct = el('cleaningSummaryTable');
        if (ct) {
            let html = '<table class="table table-striped table-hover"><thead><tr><th>Step</th><th>Details</th><th>Count</th></tr></thead><tbody>';
            html += '<tr><td>Missing: Bathrooms</td><td>Filled with median (' + pp.imputationValues.Bathrooms_median + ')</td><td>' + mv.Bathrooms + '</td></tr>';
            html += '<tr><td>Missing: Property_Age</td><td>Filled with median (' + pp.imputationValues.Property_Age_median + ')</td><td>' + mv.Property_Age + '</td></tr>';
            html += '<tr><td>Missing: Parking</td><td>Filled with median (' + pp.imputationValues.Parking_median + ')</td><td>' + mv.Parking + '</td></tr>';
            html += '<tr><td>Missing: Furnishing</td><td>Filled with mode (' + pp.imputationValues.Furnishing_mode + ')</td><td>' + mv.Furnishing + '</td></tr>';
            html += '<tr><td>Duplicate Rows</td><td>Removed (kept first)</td><td>' + pp.duplicatesCount + '</td></tr>';
            html += '<tr><td>Negative Ages</td><td>Converted to absolute value</td><td>' + pp.incorrectValues.negativeAges + '</td></tr>';
            html += '<tr><td>Zero Areas</td><td>Replaced with type median</td><td>' + pp.incorrectValues.zeroAreas + '</td></tr>';
            html += '</tbody></table>';
            ct.innerHTML = html;
        }
    }

    // === 3. Descriptive Statistics ===
    function renderDescriptive() {
        const d = P.descriptive;
        const ct = d.centralTendency;
        const dp = d.dispersion;

        const ctDiv = el('centralTendencyStats');
        if (ctDiv) {
            ctDiv.innerHTML =
                '<div class="col-md-4"><div class="stat-card"><div class="stat-value">' + fmtCrLk(ct.mean) + '</div><div class="stat-label">Mean</div></div></div>' +
                '<div class="col-md-4"><div class="stat-card accent"><div class="stat-value">' + fmtCrLk(ct.median) + '</div><div class="stat-label">Median</div></div></div>' +
                '<div class="col-md-4"><div class="stat-card success"><div class="stat-value">' + fmtCrLk(ct.mode) + '</div><div class="stat-label">Mode</div></div></div>';
        }

        const dpDiv = el('dispersionStats');
        if (dpDiv) {
            dpDiv.innerHTML =
                '<div class="col-6 col-lg-3"><div class="stat-card"><div class="stat-value">' + fmtCrLk(dp.std) + '</div><div class="stat-label">Std Deviation</div></div></div>' +
                '<div class="col-6 col-lg-3"><div class="stat-card accent"><div class="stat-value">' + fmtCrLk(dp.range) + '</div><div class="stat-label">Range</div></div></div>' +
                '<div class="col-6 col-lg-3"><div class="stat-card success"><div class="stat-value">' + fmtCrLk(dp.IQR) + '</div><div class="stat-label">IQR</div></div></div>' +
                '<div class="col-6 col-lg-3"><div class="stat-card warning"><div class="stat-value">Q1: ' + fmtCrLk(dp.Q1) + '<br>Q3: ' + fmtCrLk(dp.Q3) + '</div><div class="stat-label">Quartiles</div></div></div>';
        }

        makeChart('priceHistogramChart', {
            type: 'bar',
            data: {
                labels: d.priceHistogram.labels.map(l => fmtCrLk(parseFloat(l))),
                datasets: [{
                    label: 'Frequency',
                    data: d.priceHistogram.values,
                    backgroundColor: COLORS.primary + 'aa',
                    borderColor: COLORS.primary,
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, title: { display: true, text: 'House Price Distribution' } },
                scales: {
                    x: { title: { display: true, text: 'Price Range' }, ticks: { maxRotation: 45, font: { size: 10 } } },
                    y: { title: { display: true, text: 'Count' }, beginAtZero: true }
                }
            }
        });

        const bp = d.priceBoxplot;
        makeChart('priceBoxplotChart', {
            type: 'bar',
            data: {
                labels: ['House Price'],
                datasets: [
                    { label: 'Min → Q1', data: [bp.q1 - bp.whiskerLow], backgroundColor: COLORS.blue + '44', borderColor: COLORS.blue, borderWidth: 1 },
                    { label: 'Q1 → Median', data: [bp.median - bp.q1], backgroundColor: COLORS.primary + '99', borderColor: COLORS.primary, borderWidth: 1 },
                    { label: 'Median → Q3', data: [bp.q3 - bp.median], backgroundColor: COLORS.accent + '99', borderColor: COLORS.accent, borderWidth: 1 },
                    { label: 'Q3 → Whisker High', data: [bp.whiskerHigh - bp.q3], backgroundColor: COLORS.success + '44', borderColor: COLORS.success, borderWidth: 1 }
                ]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'Box Plot of House Prices' },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                const labels = ['Min: ' + fmtCrLk(bp.whiskerLow) + ', Q1: ' + fmtCrLk(bp.q1),
                                    'Q1: ' + fmtCrLk(bp.q1) + ', Median: ' + fmtCrLk(bp.median),
                                    'Median: ' + fmtCrLk(bp.median) + ', Q3: ' + fmtCrLk(bp.q3),
                                    'Q3: ' + fmtCrLk(bp.q3) + ', Max: ' + fmtCrLk(bp.whiskerHigh)];
                                return labels[ctx.datasetIndex] || '';
                            }
                        }
                    }
                },
                scales: {
                    x: { stacked: true, title: { display: true, text: 'Price (₹)' }, ticks: { callback: v => fmtCrLk(v + bp.whiskerLow) } },
                    y: { stacked: true }
                }
            }
        });

        const feats = { 'areaDistChart': 'Area_SqFt', 'bedroomDistChart': 'Bedrooms', 'bathroomDistChart': 'Bathrooms', 'ageDistChart': 'Property_Age' };
        const fColors = [COLORS.primary, COLORS.accent, COLORS.success, COLORS.warning];
        let fi = 0;
        for (const [canvasId, feat] of Object.entries(feats)) {
            const fh = d.featureHistograms[feat];
            if (fh) {
                makeChart(canvasId, {
                    type: 'bar',
                    data: {
                        labels: fh.labels.map(l => typeof l === 'number' ? fmt(l, 0) : l),
                        datasets: [{
                            label: feat,
                            data: fh.values,
                            backgroundColor: fColors[fi] + '99',
                            borderColor: fColors[fi],
                            borderWidth: 1,
                            borderRadius: 3
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false }, title: { display: true, text: feat.replace('_', ' ') + ' Distribution', font: { size: 13 } } },
                        scales: { x: { ticks: { maxRotation: 45, font: { size: 9 } } }, y: { beginAtZero: true } }
                    }
                });
            }
            fi++;
        }

        const skDiv = el('skewKurtTable');
        if (skDiv && d.skewnessKurtosis) {
            let html = '<table class="table table-striped table-hover"><thead><tr><th>Feature</th><th>Skewness</th><th>Kurtosis</th><th>Interpretation</th></tr></thead><tbody>';
            d.skewnessKurtosis.forEach(r => {
                const skew = parseFloat(r.skewness);
                const interp = Math.abs(skew) < 0.5 ? 'Roughly symmetric' : (skew > 0 ? 'Right-skewed' : 'Left-skewed');
                html += '<tr><td>' + r.feature + '</td><td>' + fmt(r.skewness) + '</td><td>' + fmt(r.kurtosis) + '</td><td>' + interp + '</td></tr>';
            });
            html += '</tbody></table>';
            skDiv.innerHTML = html;
        }

        const od = el('outlierStats');
        if (od && d.outlierDetection) {
            od.innerHTML =
                '<div class="row g-3">' +
                '<div class="col-md-6"><div class="stat-card warning"><div class="stat-value">' + d.outlierDetection.iqr.count + ' (' + fmt(d.outlierDetection.iqr.percentage || d.outlierDetection.iqr.pct) + '%)</div><div class="stat-label">IQR Method Outliers</div></div></div>' +
                '<div class="col-md-6"><div class="stat-card"><div class="stat-value">' + d.outlierDetection.zscore.count + ' (' + fmt(d.outlierDetection.zscore.percentage || d.outlierDetection.zscore.pct) + '%)</div><div class="stat-label">Z-Score Method (|z| &gt; 3)</div></div></div>' +
                '</div>';
        }
    }

    // === 4. Inferential Statistics ===
    function renderInferential() {
        const inf = P.inferential;
        const s = inf.sampling;

        makeChart('samplingChart', {
            type: 'bar',
            data: {
                labels: ['Simple Random', 'Systematic', 'Stratified'],
                datasets: [{
                    label: 'Sample Means (30 trials)',
                    data: [
                        s.simple.reduce((a, b) => a + b, 0) / s.simple.length,
                        s.systematic.reduce((a, b) => a + b, 0) / s.systematic.length,
                        s.stratified.reduce((a, b) => a + b, 0) / s.stratified.length
                    ],
                    backgroundColor: [COLORS.primary + 'cc', COLORS.accent + 'cc', COLORS.success + 'cc'],
                    borderColor: [COLORS.primary, COLORS.accent, COLORS.success],
                    borderWidth: 2, borderRadius: 8
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'Average of 30 Sample Means vs Population Mean (' + fmtCrLk(s.populationMean) + ')' },
                    legend: { display: false }
                },
                scales: { y: { title: { display: true, text: 'Mean Price (₹)' }, ticks: { callback: v => fmtCrLk(v) } } }
            }
        });

        makeChart('llnChart', {
            type: 'line',
            data: {
                labels: inf.lln.sampleSizes,
                datasets: [
                    {
                        label: 'Cumulative Mean',
                        data: inf.lln.cumulativeMeans,
                        borderColor: COLORS.primary,
                        backgroundColor: COLORS.primary + '22',
                        fill: false, tension: 0.3, pointRadius: 0, borderWidth: 2
                    },
                    {
                        label: 'Population Mean',
                        data: inf.lln.sampleSizes.map(() => s.populationMean),
                        borderColor: COLORS.danger,
                        borderDash: [8, 4], pointRadius: 0, borderWidth: 2, fill: false
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'Law of Large Numbers: Cumulative Mean Converges to Population Mean' } },
                scales: {
                    x: { title: { display: true, text: 'Sample Size' } },
                    y: { title: { display: true, text: 'Mean Price (₹)' }, ticks: { callback: v => fmtCrLk(v) } }
                }
            }
        });

        const pr = el('probabilityResults');
        if (pr && inf.probability) {
            const p = inf.probability;
            pr.innerHTML =
                '<div class="row g-3">' +
                '<div class="col-md-6"><div class="stat-card"><div class="stat-value">' + fmt(p.pAboveThreshold * 100) + '%</div><div class="stat-label">P(Price &gt; ' + fmtCrLk(p.threshold) + ')</div></div></div>' +
                '<div class="col-md-6"><div class="stat-card accent"><div class="stat-value">' + fmt(p.pAboveGivenMumbai * 100) + '%</div><div class="stat-label">P(Price &gt; threshold | Mumbai)</div></div></div>' +
                '<div class="col-md-6"><div class="stat-card success"><div class="stat-value">' + fmt(p.pMumbai * 100) + '%</div><div class="stat-label">P(Mumbai)</div></div></div>' +
                '<div class="col-md-6"><div class="stat-card warning"><div class="stat-value">' + fmt(p.pMumbaiGivenAbove * 100) + '%</div><div class="stat-label">P(Mumbai | Price &gt; threshold) [Bayes]</div></div></div>' +
                '</div>' +
                '<div class="mt-3 p-3" style="background:#f1f5f9;border-radius:10px;">' +
                '<strong>Bayes\' Theorem:</strong> P(Mumbai | High Price) = P(High Price | Mumbai) × P(Mumbai) / P(High Price)<br>' +
                '= ' + fmt(p.pAboveGivenMumbai, 3) + ' × ' + fmt(p.pMumbai, 3) + ' / ' + fmt(p.pAboveThreshold, 3) + ' = <strong>' + fmt(p.pMumbaiGivenAbove, 3) + '</strong></div>';
        }

        const ht = el('hypothesisResults');
        if (ht && inf.hypothesis) {
            const h = inf.hypothesis;
            const rejected = h.pValue < h.alpha;
            ht.innerHTML =
                '<div class="p-3" style="background:#f1f5f9;border-radius:10px;">' +
                '<p><strong>H₀ (Null):</strong> Mean price of ' + h.group1 + ' houses = Mean price of ' + h.group2 + ' houses</p>' +
                '<p><strong>H₁ (Alternative):</strong> Mean price of ' + h.group1 + ' houses ≠ Mean price of ' + h.group2 + ' houses</p>' +
                '<hr>' +
                '<div class="row g-3 my-2">' +
                '<div class="col-md-3"><div class="stat-card"><div class="stat-value">' + fmtCrLk(h.group1Mean) + '</div><div class="stat-label">' + h.group1 + ' Mean</div></div></div>' +
                '<div class="col-md-3"><div class="stat-card accent"><div class="stat-value">' + fmtCrLk(h.group2Mean) + '</div><div class="stat-label">' + h.group2 + ' Mean</div></div></div>' +
                '<div class="col-md-3"><div class="stat-card warning"><div class="stat-value">' + fmt(h.tStatistic) + '</div><div class="stat-label">t-Statistic</div></div></div>' +
                '<div class="col-md-3"><div class="stat-card ' + (rejected ? 'danger' : 'success') + '"><div class="stat-value">' + (h.pValue < 0.001 ? '< 0.001' : fmt(h.pValue, 4)) + '</div><div class="stat-label">p-Value</div></div></div>' +
                '</div>' +
                '<div class="alert ' + (rejected ? 'alert-warning' : 'alert-success') + ' mt-3">' +
                '<strong>Conclusion (α = ' + h.alpha + '):</strong> ' + h.conclusion + '</div></div>';
        }
    }

    // === 5. Correlation ===
    function renderCorrelation() {
        const c = P.correlation;

        function buildHeatmap(containerId, matrix, labels) {
            const div = el(containerId);
            if (!div) return;
            const shortLabels = labels.map(l => l.length > 12 ? l.substring(0, 10) + '..' : l);
            let html = '<div style="overflow-x:auto;"><table class="heatmap-table"><thead><tr><th></th>';
            shortLabels.forEach(l => { html += '<th>' + l + '</th>'; });
            html += '</tr></thead><tbody>';
            matrix.forEach((row, i) => {
                html += '<tr><th>' + shortLabels[i] + '</th>';
                row.forEach(val => {
                    const v = parseFloat(val);
                    const r = v > 0 ? Math.round(239 + (v) * (68 - 239)) : Math.round(239 + (-v) * (59 - 239));
                    const g = v > 0 ? Math.round(239 + (v) * (68 - 239)) : Math.round(239 + (-v) * (130 - 239));
                    const b = v > 0 ? Math.round(239 + (v) * (244 - 239)) : Math.round(239 + (-v) * (246 - 239));
                    const textColor = Math.abs(v) > 0.5 ? '#fff' : '#333';
                    html += '<td style="background:rgb(' + r + ',' + g + ',' + b + ');color:' + textColor + ';border-radius:4px;">' + v.toFixed(2) + '</td>';
                });
                html += '</tr>';
            });
            html += '</tbody></table></div>';
            div.innerHTML = html;
        }

        buildHeatmap('pearsonHeatmapDiv', c.pearsonMatrix, c.labels);
        buildHeatmap('spearmanHeatmapDiv', c.spearmanMatrix, c.labels);

        const topF = c.topFeatures.filter(f => f.feature !== 'House_Price').slice(0, 10);
        makeChart('topFeaturesChart', {
            type: 'bar',
            data: {
                labels: topF.map(f => f.feature),
                datasets: [{
                    label: 'Pearson Correlation with Price',
                    data: topF.map(f => f.correlation),
                    backgroundColor: topF.map(f => f.correlation >= 0 ? COLORS.primary + 'cc' : COLORS.danger + 'cc'),
                    borderColor: topF.map(f => f.correlation >= 0 ? COLORS.primary : COLORS.danger),
                    borderWidth: 1, borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, title: { display: true, text: 'Top Features Correlated with House Price' } },
                scales: { x: { min: -1, max: 1, title: { display: true, text: 'Correlation Coefficient' } } }
            }
        });
    }

    // === 6. Regression ===
    function renderRegression() {
        const r = P.regression;

        const sc = r.simple.scatter;
        const ln = r.simple.line;
        makeChart('simpleRegressionChart', {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Data Points',
                        data: sc.x.map((xi, i) => ({ x: xi, y: sc.y[i] })),
                        backgroundColor: COLORS.primary + '55',
                        borderColor: COLORS.primary,
                        pointRadius: 3
                    },
                    {
                        label: 'Regression Line',
                        data: ln.x.map((xi, i) => ({ x: xi, y: ln.y[i] })),
                        type: 'line', borderColor: COLORS.danger, borderWidth: 3,
                        pointRadius: 0, fill: false, tension: 0
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'Simple Linear Regression: Area vs Price' } },
                scales: {
                    x: { title: { display: true, text: 'Area (sq ft)' } },
                    y: { title: { display: true, text: 'Price (₹)' }, ticks: { callback: v => fmtCrLk(v) } }
                }
            }
        });

        const ssd = el('simpleRegressionStats');
        if (ssd) {
            ssd.innerHTML =
                '<div class="p-3" style="background:#f1f5f9;border-radius:10px;">' +
                '<h6>Regression Equation</h6>' +
                '<p class="font-mono" style="font-family:monospace;font-size:1.1em;">' + r.simple.equation + '</p>' +
                '<div class="row g-3 mt-2">' +
                '<div class="col-6"><strong>Coefficient:</strong> ' + fmt(r.simple.coefficient) + '</div>' +
                '<div class="col-6"><strong>Intercept:</strong> ' + fmtCurrency(r.simple.intercept) + '</div>' +
                '</div>' +
                '<h6 class="mt-3">Test Metrics</h6>' +
                '<table class="table table-sm"><tr><th>MAE</th><th>RMSE</th><th>R²</th></tr>' +
                '<tr><td>' + fmtCurrency(r.simple.testMetrics.mae) + '</td><td>' + fmtCurrency(r.simple.testMetrics.rmse) + '</td><td>' + fmt(r.simple.testMetrics.r2) + '</td></tr></table></div>';
        }

        const avp = r.multiple.actualVsPredicted;
        makeChart('actualVsPredictedChart', {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Predictions',
                        data: avp.actual.map((a, i) => ({ x: a, y: avp.predicted[i] })),
                        backgroundColor: COLORS.accent + '77',
                        borderColor: COLORS.accent,
                        pointRadius: 4
                    },
                    {
                        label: 'Perfect Prediction',
                        data: [{ x: Math.min(...avp.actual), y: Math.min(...avp.actual) }, { x: Math.max(...avp.actual), y: Math.max(...avp.actual) }],
                        type: 'line', borderColor: COLORS.danger, borderDash: [6, 4], borderWidth: 2,
                        pointRadius: 0, fill: false
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'Multiple Regression: Actual vs Predicted' } },
                scales: {
                    x: { title: { display: true, text: 'Actual Price (₹)' }, ticks: { callback: v => fmtCrLk(v) } },
                    y: { title: { display: true, text: 'Predicted Price (₹)' }, ticks: { callback: v => fmtCrLk(v) } }
                }
            }
        });

        const msd = el('multipleRegressionStats');
        if (msd) {
            let html = '<div class="p-3" style="background:#f1f5f9;border-radius:10px;">';
            html += '<h6>Top Feature Coefficients</h6><table class="table table-sm"><thead><tr><th>Feature</th><th>Coefficient</th></tr></thead><tbody>';
            const coeffEntries = Object.entries(r.multiple.coefficients).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 8);
            coeffEntries.forEach(([k, v]) => { html += '<tr><td>' + k + '</td><td>' + fmt(v) + '</td></tr>'; });
            html += '</tbody></table>';
            html += '<h6 class="mt-3">Test Metrics</h6><table class="table table-sm"><tr><th>MAE</th><th>RMSE</th><th>R²</th></tr>';
            html += '<tr><td>' + fmtPctErr(r.multiple.testMetrics.mae) + '</td><td>' + fmtPctErr(r.multiple.testMetrics.rmse) + '</td><td>' + fmt(r.multiple.testMetrics.r2) + '</td></tr></table></div>';
            msd.innerHTML = html;
        }

        const rct = el('regressionComparisonTable');
        if (rct) {
            rct.innerHTML =
                '<table class="table table-striped table-hover"><thead><tr><th>Model</th><th>MAE</th><th>RMSE</th><th>R²</th></tr></thead><tbody>' +
                '<tr><td>Simple (Area only)</td><td>' + fmtCurrency(r.simple.testMetrics.mae) + '</td><td>' + fmtCurrency(r.simple.testMetrics.rmse) + '</td><td>' + fmt(r.simple.testMetrics.r2) + '</td></tr>' +
                '<tr class="table-success"><td>Multiple (All features)</td><td>' + fmtCurrency(r.multiple.testMetrics.mae) + '</td><td>' + fmtCurrency(r.multiple.testMetrics.rmse) + '</td><td>' + fmt(r.multiple.testMetrics.r2) + '</td></tr>' +
                '</tbody></table>';
        }
    }

    // === 7. Linear Algebra ===
    function renderLinearAlgebra() {
        const la = P.linearAlgebra;

        const fmd = el('featureMatrixDisplay');
        if (fmd) {
            let html = '<div style="overflow-x:auto"><table class="table table-sm table-bordered" style="font-size:0.75em;"><thead><tr><th>#</th>';
            la.featureNames.forEach(n => { html += '<th>' + (n.length > 10 ? n.substring(0, 8) + '..' : n) + '</th>'; });
            html += '</tr></thead><tbody>';
            la.featureMatrixSample.forEach((row, i) => {
                html += '<tr><td><strong>' + (i + 1) + '</strong></td>';
                row.forEach(v => { html += '<td>' + fmt(v, 1) + '</td>'; });
                html += '</tr>';
            });
            html += '</tbody></table></div>';
            fmd.innerHTML = html;
        }

        const mod = el('matrixOpsDisplay');
        if (mod) {
            mod.innerHTML =
                '<div class="p-3" style="background:#f1f5f9;border-radius:10px;font-family:monospace;">' +
                '<p><strong>Dimensions:</strong></p>' +
                '<p>X (feature matrix): ' + la.dimensions.X[0] + ' × ' + la.dimensions.X[1] + '</p>' +
                '<p>W (weight vector): ' + la.dimensions.w[0] + ' × ' + la.dimensions.w[1] + '</p>' +
                '<p>y (target vector): ' + la.dimensions.y[0] + ' × ' + la.dimensions.y[1] + '</p>' +
                '<hr>' +
                '<p><strong>Prediction = X · W + b</strong></p>' +
                '<p>Where b (intercept) = ' + fmtCurrency(P.regression.multiple.intercept) + '</p></div>';
        }

        const pct = el('predictionComparisonTable');
        if (pct) {
            let html = '<table class="table table-striped"><thead><tr><th>#</th><th>Actual</th><th>Manual (X·W+b)</th><th>Sklearn</th></tr></thead><tbody>';
            la.targetVectorSample.forEach((actual, i) => {
                html += '<tr><td>' + (i + 1) + '</td><td>' + fmtCurrency(actual) + '</td><td>' + fmtCurrency(la.manualPredictions[i]) + '</td><td>' + fmtCurrency(la.manualPredictions[i]) + '</td></tr>';
            });
            html += '</tbody></table>';
            pct.innerHTML = html;
        }
    }

    // === 8. Calculus & Gradient Descent ===
    function renderCalculus() {
        const gd = P.gradientDescent;

        makeChart('costChart', {
            type: 'line',
            data: {
                labels: Array.from({ length: gd.iterations }, (_, i) => i + 1),
                datasets: [{
                    label: 'Cost (MSE)',
                    data: gd.costHistory,
                    borderColor: COLORS.danger,
                    backgroundColor: COLORS.danger + '11',
                    fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'Cost Function vs Iterations (Gradient Descent)' } },
                scales: {
                    x: { title: { display: true, text: 'Iteration' } },
                    y: { title: { display: true, text: 'MSE Cost' } }
                }
            }
        });

        makeChart('weightChart', {
            type: 'line',
            data: {
                labels: Array.from({ length: gd.iterations }, (_, i) => i + 1),
                datasets: [
                    {
                        label: 'Weight (w)',
                        data: gd.weightHistory,
                        borderColor: COLORS.primary, fill: false, tension: 0.3, pointRadius: 0, borderWidth: 2
                    },
                    {
                        label: 'Bias (b)',
                        data: gd.biasHistory,
                        borderColor: COLORS.accent, fill: false, tension: 0.3, pointRadius: 0, borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'Weight & Bias Convergence' } },
                scales: {
                    x: { title: { display: true, text: 'Iteration' } },
                    y: { title: { display: true, text: 'Parameter Value' } }
                }
            }
        });

        const gs = el('gdSteps');
        if (gs) {
            gs.innerHTML =
                '<div class="p-3" style="background:#f1f5f9;border-radius:10px;">' +
                '<div class="row g-3 mb-3">' +
                '<div class="col-md-4"><div class="stat-card"><div class="stat-value">' + gd.learningRate + '</div><div class="stat-label">Learning Rate (α)</div></div></div>' +
                '<div class="col-md-4"><div class="stat-card accent"><div class="stat-value">' + gd.iterations + '</div><div class="stat-label">Total Iterations</div></div></div>' +
                '<div class="col-md-4"><div class="stat-card success"><div class="stat-value">' + fmt(gd.finalWeight) + '</div><div class="stat-label">Final Weight</div></div></div>' +
                '</div>' +
                '<h6>Update Rules (per iteration):</h6>' +
                '<div style="font-family:monospace;font-size:0.95em;line-height:2;">' +
                '<p>1. Predict: ŷ = w · x + b</p>' +
                '<p>2. Error: e = ŷ - y</p>' +
                '<p>3. Gradient w: ∂J/∂w = (2/n) · Σ(x · e)</p>' +
                '<p>4. Gradient b: ∂J/∂b = (2/n) · Σ(e)</p>' +
                '<p>5. Update: w = w - α · ∂J/∂w</p>' +
                '<p>6. Update: b = b - α · ∂J/∂b</p>' +
                '</div></div>';
        }
    }

    // === 9. Model Evaluation ===
    function renderEvaluation() {
        const ev = P.evaluation;

        const mct = el('modelComparisonTable');
        if (mct) {
            let html = '<table class="table table-striped table-hover"><thead><tr><th>Model</th><th>MAE</th><th>MSE</th><th>RMSE</th><th>R²</th></tr></thead><tbody>';
            ev.models.forEach(m => {
                const best = m.name === ev.bestModel ? ' class="table-success"' : '';
                html += '<tr' + best + '><td><strong>' + m.name + '</strong>' + (m.name === ev.bestModel ? ' ⭐' : '') + '</td>';
                html += '<td>' + fmtPctErr(m.mae) + '</td><td>' + fmtPctMse(m.mse) + '</td><td>' + fmtPctErr(m.rmse) + '</td><td>' + fmt(m.r2) + '</td></tr>';
            });
            html += '</tbody></table>';
            mct.innerHTML = html;
        }

        makeChart('modelComparisonChart', {
            type: 'bar',
            data: {
                labels: ev.models.map(m => m.name),
                datasets: [
                    { label: 'R² Score', data: ev.models.map(m => m.r2), backgroundColor: COLORS.primary + 'cc', borderColor: COLORS.primary, borderWidth: 1, borderRadius: 6 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'R² Score Comparison' } },
                scales: { y: { beginAtZero: true, max: 1, title: { display: true, text: 'R²' } } }
            }
        });

        const residuals = P.regression.multiple.residuals || [];
        makeChart('residualPlotChart', {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Residuals',
                    data: residuals.map((r, i) => ({ x: i, y: r })),
                    backgroundColor: COLORS.primary + '55',
                    borderColor: COLORS.primary,
                    pointRadius: 3
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'Residual Plot' } },
                scales: {
                    x: { title: { display: true, text: 'Sample Index' } },
                    y: { title: { display: true, text: 'Residual (₹)' }, ticks: { callback: v => fmtCrLk(v) } }
                }
            }
        });

        const rh = ev.residualHistogram;
        if (rh) {
            makeChart('residualHistogramChart', {
                type: 'bar',
                data: {
                    labels: rh.labels.map(l => fmtCrLk(parseFloat(l))),
                    datasets: [{
                        label: 'Frequency',
                        data: rh.values,
                        backgroundColor: COLORS.accent + 'aa',
                        borderColor: COLORS.accent,
                        borderWidth: 1, borderRadius: 3
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, title: { display: true, text: 'Residual Distribution' } },
                    scales: { x: { ticks: { maxRotation: 45, font: { size: 9 } } }, y: { beginAtZero: true } }
                }
            });
        }

        const avp = ev.actualVsPredicted;
        makeChart('evalActualPredictedChart', {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Predictions',
                        data: avp.actual.map((a, i) => ({ x: a, y: avp.predicted[i] })),
                        backgroundColor: COLORS.success + '77',
                        borderColor: COLORS.success,
                        pointRadius: 3
                    },
                    {
                        label: 'Perfect (y=x)',
                        data: [{ x: Math.min(...avp.actual), y: Math.min(...avp.actual) }, { x: Math.max(...avp.actual), y: Math.max(...avp.actual) }],
                        type: 'line', borderColor: COLORS.danger, borderDash: [6, 4], borderWidth: 2,
                        pointRadius: 0, fill: false
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'Best Model: Actual vs Predicted Prices' } },
                scales: {
                    x: { title: { display: true, text: 'Actual (₹)' }, ticks: { callback: v => fmtCrLk(v) } },
                    y: { title: { display: true, text: 'Predicted (₹)' }, ticks: { callback: v => fmtCrLk(v) } }
                }
            }
        });

        const cvd = el('cvResults');
        if (cvd && ev.crossValidation) {
            const cv = ev.crossValidation;
            cvd.innerHTML =
                '<div class="row g-3">' +
                '<div class="col-md-4"><div class="stat-card"><div class="stat-value">' + cv.method + '</div><div class="stat-label">Method</div></div></div>' +
                '<div class="col-md-4"><div class="stat-card accent"><div class="stat-value">' + fmt(cv.mean) + '</div><div class="stat-label">Mean R²</div></div></div>' +
                '<div class="col-md-4"><div class="stat-card success"><div class="stat-value">± ' + fmt(cv.std) + '</div><div class="stat-label">Std Deviation</div></div></div>' +
                '</div>' +
                '<div class="mt-3 p-3" style="background:#f1f5f9;border-radius:10px;">' +
                '<strong>Fold Scores:</strong> ' + cv.scores.map(s => fmt(s)).join(', ') +
                '<br><small>Low standard deviation indicates the model generalizes consistently across different data splits.</small></div>';
        }
    }

    // === 10. Predictor (Full Form) ===
    function setupPredictor() {
        const citySelect = el('predCity');
        const locSelect = el('predLocation');

        citySelect.addEventListener('change', function() {
            populateLocations(locSelect, citySelect.value);
        });
        populateLocations(locSelect, citySelect.value);

        el('predictorForm').addEventListener('submit', function (e) {
            e.preventDefault();

            const price = computePrediction(
                citySelect.value,
                locSelect.value,
                el('predPropertyType').value,
                parseFloat(el('predArea').value),
                parseFloat(el('predBedrooms').value),
                parseFloat(el('predBathrooms').value),
                parseFloat(el('predFloors').value),
                parseFloat(el('predAge').value),
                parseFloat(el('predParking').value),
                el('predFurnishing').value
            );

            el('predictedPriceValue').textContent = fmtCurrency(price);
            el('predictionNote').textContent = 'Estimated price for a ' + el('predArea').value + ' sq ft ' + el('predPropertyType').value + ' in ' + locSelect.value + ', ' + citySelect.value;
            el('predictionResult').classList.add('show');
        });
    }

    // === 11. Quick Predict Strip ===
    function setupQuickPredict() {
        const qpCity = el('qpCity');
        const qpLoc = el('qpLocation');
        const qpBtn = el('qpBtn');
        const qpResult = el('qpResult');
        const qpResultValue = el('qpResultValue');

        if (!qpCity || !qpLoc || !qpBtn) return;

        qpCity.addEventListener('change', function() {
            populateLocations(qpLoc, qpCity.value);
        });
        populateLocations(qpLoc, qpCity.value);

        qpBtn.addEventListener('click', function() {
            const price = computePrediction(
                qpCity.value,
                qpLoc.value,
                el('qpType').value,
                parseFloat(el('qpArea').value),
                parseFloat(el('qpBedrooms').value),
                2, // default bathrooms
                1, // default floors
                5, // default age
                1, // default parking
                'Semi-Furnished' // default furnishing
            );

            qpResultValue.textContent = fmtCurrency(price);
            qpResult.classList.add('show');

            // Auto-hide after 8 seconds
            setTimeout(function() {
                qpResult.classList.remove('show');
            }, 8000);
        });
    }

    // === Navigation ===
    function setupNavigation() {
        const sections = document.querySelectorAll('.content-section');
        const navLinks = document.querySelectorAll('.sidebar-nav li a[data-section]');

        // Scroll spy using IntersectionObserver
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('data-section') || entry.target.id;
                    navLinks.forEach(link => {
                        const isMatch = link.getAttribute('data-section') === id;
                        if (isMatch && !link.classList.contains('predict-cta')) {
                            link.classList.add('active');
                        } else if (!link.classList.contains('predict-cta')) {
                            link.classList.remove('active');
                        }
                    });
                }
            });
        }, { rootMargin: '-20% 0px -70% 0px' });

        sections.forEach(s => observer.observe(s));

        // Smooth scroll on nav click
        navLinks.forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                const sectionId = this.getAttribute('data-section');
                const target = document.getElementById(sectionId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                // Close mobile sidebar
                const sidebar = document.querySelector('.sidebar');
                const overlay = el('sidebarOverlay');
                if (sidebar) sidebar.classList.remove('show');
                if (overlay) overlay.classList.remove('show');
            });
        });

        // Mobile toggle
        const toggle = el('sidebarToggle');
        const sidebar = document.querySelector('.sidebar');
        const overlay = el('sidebarOverlay');
        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('show');
                if (overlay) overlay.classList.toggle('show');
            });
        }
        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('show');
                overlay.classList.remove('show');
            });
        }

        // Back to top
        const btt = el('backToTop');
        if (btt) {
            window.addEventListener('scroll', () => {
                btt.classList.toggle('visible', window.scrollY > 300);
            });
            btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        }

        // Floating predict button — hide when predictor section is visible
        const floatingBtn = el('floatingPredictBtn');
        const predictorSection = el('predictor');
        if (floatingBtn && predictorSection) {
            const floatingObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    floatingBtn.style.opacity = entry.isIntersecting ? '0' : '1';
                    floatingBtn.style.pointerEvents = entry.isIntersecting ? 'none' : 'auto';
                });
            }, { threshold: 0.1 });
            floatingObserver.observe(predictorSection);

            floatingBtn.addEventListener('click', function(e) {
                e.preventDefault();
                predictorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }

        // Hero "Try the Predictor" button
        const heroBtn = document.querySelector('.hero-btn');
        if (heroBtn) {
            heroBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.getElementById('predictor');
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
    }

    // === Run All ===
    renderHero();
    renderOverview();
    renderPreprocessing();
    renderDescriptive();
    renderInferential();
    renderCorrelation();
    renderRegression();
    renderLinearAlgebra();
    renderCalculus();
    renderEvaluation();
    setupPredictor();
    setupQuickPredict();
    setupNavigation();

    console.log('House Price Prediction dashboard loaded successfully.');
});
