    
        // Export Functionality with Scrollable Modal
        class XP98StatsExporter {
            constructor() {
                this.selectedFormat = null;
                this.isExporting = false;
                this.eventsBound = false;
                this.init();
            }

            init() {
                this.bindEvents();
            }

            bindEvents() {
                // Prevent multiple event listeners by checking if already bound
                if (this.eventsBound) return;
                this.eventsBound = true;

                // Export button click
                const exportTrigger = document.getElementById('xp98stats-export-trigger');
                if (exportTrigger) {
                    exportTrigger.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.openModal();
                    });
                }

                // Modal events
                const closeModal = document.getElementById('xp98stats-close-modal');
                const cancelBtn = document.getElementById('xp98stats-cancel-btn');
                const exportBtn = document.getElementById('xp98stats-export-btn');

                if (closeModal) closeModal.addEventListener('click', () => this.closeModal());
                if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());
                if (exportBtn) exportBtn.addEventListener('click', () => this.exportData());

                // Format selection
                document.querySelectorAll('.xp98stats-format-option').forEach(option => {
                    option.addEventListener('click', () => this.selectFormat(option));
                });

                // Close on overlay click
                const overlay = document.getElementById('xp98stats-export-modal-overlay');
                if (overlay) {
                    overlay.addEventListener('click', (e) => {
                        if (e.target.id === 'xp98stats-export-modal-overlay') {
                            this.closeModal();
                        }
                    });
                }

                // Close on escape key
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && document.getElementById('xp98stats-export-modal-overlay').classList.contains('xp98stats-active')) {
                        this.closeModal();
                    }
                });

                // Prevent scroll on body when modal is open
                this.preventBodyScroll();
            }

            preventBodyScroll() {
                const modalOverlay = document.getElementById('xp98stats-export-modal-overlay');
                
                // Observe modal state changes
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.attributeName === 'class') {
                            if (modalOverlay.classList.contains('xp98stats-active')) {
                                document.body.classList.add('modal-open');
                            } else {
                                document.body.classList.remove('modal-open');
                            }
                        }
                    });
                });

                observer.observe(modalOverlay, { attributes: true, attributeFilter: ['class'] });
            }

            openModal() {
                const modalOverlay = document.getElementById('xp98stats-export-modal-overlay');
                const modalBody = modalOverlay.querySelector('.xp98stats-modal-body');
                
                modalOverlay.classList.add('xp98stats-active');
                
                // Reset scroll position to top when opening
                modalBody.scrollTop = 0;
                
                // Focus management for accessibility
                setTimeout(() => {
                    const firstFocusableElement = modalOverlay.querySelector('.xp98stats-format-option');
                    if (firstFocusableElement) {
                        firstFocusableElement.focus();
                    }
                }, 100);
            }

            closeModal() {
                document.getElementById('xp98stats-export-modal-overlay').classList.remove('xp98stats-active');
                this.resetModal();
            }

            resetModal() {
                this.selectedFormat = null;
                document.querySelectorAll('.xp98stats-format-option').forEach(option => {
                    option.classList.remove('xp98stats-selected');
                });
                document.getElementById('xp98stats-export-btn').disabled = true;
                document.getElementById('xp98stats-success-msg').style.display = 'none';
                this.isExporting = false;
                document.getElementById('xp98stats-export-btn-text').textContent = 'Export Report';
                document.getElementById('xp98stats-export-btn').innerHTML = '<i class="fas fa-download"></i><span id="xp98stats-export-btn-text">Export Report</span>';
            }

            selectFormat(option) {
                document.querySelectorAll('.xp98stats-format-option').forEach(opt => {
                    opt.classList.remove('xp98stats-selected');
                });
                
                option.classList.add('xp98stats-selected');
                this.selectedFormat = option.dataset.format;
                document.getElementById('xp98stats-export-btn').disabled = false;

                // Scroll the selected option into view if needed
                option.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'nearest'
                });
            }

            extractStatsData() {
                const statsCards = document.querySelectorAll('.stat-card');
                const data = [];
                const timestamp = new Date().toLocaleString();

                data.push({
                    title: 'Statistics Report',
                    timestamp: timestamp,
                    stats: []
                });

                statsCards.forEach(card => {
                    const icon = card.querySelector('.stat-icon i') ? card.querySelector('.stat-icon i').className : 'fas fa-chart-bar';
                    const number = card.querySelector('.stat-number') ? card.querySelector('.stat-number').textContent.trim() : 'N/A';
                    const label = card.querySelector('.stat-label') ? card.querySelector('.stat-label').textContent.trim() : 'Unknown Metric';
                    const change = card.querySelector('.stat-change');
                    const changeText = change ? change.textContent.trim() : 'No change';
                    const changeType = change && change.classList.contains('positive') ? 'Positive' : 
                                      change && change.classList.contains('negative') ? 'Negative' : 'Neutral';

                    data[0].stats.push({
                        icon,
                        metric: label,
                        value: number,
                        trend: changeType,
                        changeText: changeText
                    });
                });

                return data[0];
            }

            async exportData() {
                if (!this.selectedFormat || this.isExporting) return;

                this.isExporting = true;
                const exportBtn = document.getElementById('xp98stats-export-btn');
                exportBtn.disabled = true;
                exportBtn.innerHTML = '<div class="xp98stats-loading-spinner"></div><span>Exporting...</span>';

                try {
                    const data = this.extractStatsData();
                    
                    // Simulate processing time
                    await new Promise(resolve => setTimeout(resolve, 1500));

                    switch (this.selectedFormat) {
                        case 'txt':
                            this.exportAsTXT(data);
                            break;
                        case 'xlsx':
                            this.exportAsExcel(data);
                            break;
                        case 'pdf':
                            this.exportAsPDF(data);
                            break;
                        case 'docx':
                            this.exportAsDocx(data);
                            break;
                        case 'csv':
                            this.exportAsCSV(data);
                            break;
                        case 'json':
                            this.exportAsJSON(data);
                            break;
                    }

                    this.showSuccessMessage();
                    setTimeout(() => {
                        this.closeModal();
                    }, 2000);

                } catch (error) {
                    console.error('Export failed:', error);
                    alert('Export failed. Please try again.');
                    this.resetExportButton();
                }
            }

            exportAsTXT(data) {
                let content = `${data.title}\n`;
                content += `${'='.repeat(data.title.length)}\n\n`;
                content += `Generated: ${data.timestamp}\n\n`;
                
                content += `STATISTICS SUMMARY\n`;
                content += `${'='.repeat(18)}\n\n`;

                data.stats.forEach((stat, index) => {
                    content += `${index + 1}. ${stat.metric}\n`;
                    content += `   Value: ${stat.value}\n`;
                    content += `   Trend: ${stat.trend}\n`;
                    content += `   Change: ${stat.changeText}\n\n`;
                });

                content += `\nSUMMARY\n`;
                content += `${'='.repeat(7)}\n`;
                content += `Total metrics: ${data.stats.length}\n`;
                content += `Report generated automatically\n`;

                this.downloadFile(content, 'stats-report.txt', 'text/plain');
            }

            exportAsCSV(data) {
                let csvContent = 'Metric,Value,Trend,Change\n';
                data.stats.forEach(stat => {
                    csvContent += `"${stat.metric}","${stat.value}","${stat.trend}","${stat.changeText}"\n`;
                });
                this.downloadFile(csvContent, 'stats-report.csv', 'text/csv');
            }

            exportAsJSON(data) {
                const jsonContent = JSON.stringify(data, null, 2);
                this.downloadFile(jsonContent, 'stats-report.json', 'application/json');
            }

            exportAsExcel(data) {
                // Create Excel file using SheetJS
                const wb = XLSX.utils.book_new();
                
                // Create worksheet data
                const wsData = [
                    ['Statistics Report'],
                    [`Generated: ${data.timestamp}`],
                    [], // Empty row
                    ['Metric', 'Value', 'Trend', 'Change'], // Headers
                    ...data.stats.map(stat => [
                        stat.metric,
                        stat.value,
                        stat.trend,
                        stat.changeText || 'No change data'
                    ]),
                    [], // Empty row
                    [`Total metrics: ${data.stats.length}`],
                    ['Report generated automatically']
                ];
                
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                
                // Set column widths
                ws['!cols'] = [
                    { width: 25 }, // Metric
                    { width: 15 }, // Value
                    { width: 12 }, // Trend
                    { width: 20 }  // Change
                ];
                
                // Add worksheet to workbook
                XLSX.utils.book_append_sheet(wb, ws, 'Statistics Report');
                
                // Save as Excel file
                XLSX.writeFile(wb, 'stats-report.xlsx');
            }

            exportAsPDF(data) {
                // Create a comprehensive PDF using jsPDF
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                // Set up fonts and colors
                doc.setFontSize(24);
                doc.setTextColor(102, 126, 234);
                doc.text(data.title, 20, 30);
                
                doc.setFontSize(12);
                doc.setTextColor(100, 100, 100);
                doc.text(`Generated: ${data.timestamp}`, 20, 45);
                
                // Add a line separator
                doc.setDrawColor(102, 126, 234);
                doc.setLineWidth(0.5);
                doc.line(20, 55, 190, 55);
                
                // Table headers
                doc.setFontSize(14);
                doc.setTextColor(0, 0, 0);
                doc.text('Statistics Summary', 20, 70);
                
                // Create table data
                const tableData = data.stats.map(stat => [
                    stat.metric,
                    stat.value,
                    stat.trend,
                    stat.changeText || 'No change data'
                ]);
                
                // Add table using autoTable plugin
                doc.autoTable({
                    head: [['Metric', 'Value', 'Trend', 'Change']],
                    body: tableData,
                    startY: 80,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [102, 126, 234],
                        textColor: [255, 255, 255],
                        fontSize: 12,
                        fontStyle: 'bold'
                    },
                    bodyStyles: {
                        fontSize: 11,
                        cellPadding: 8
                    },
                    alternateRowStyles: {
                        fillColor: [248, 250, 252]
                    },
                    columnStyles: {
                        0: { cellWidth: 50 },
                        1: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
                        2: { cellWidth: 30, halign: 'center' },
                        3: { cellWidth: 60 }
                    }
                });
                
                // Add footer
                const finalY = doc.lastAutoTable.finalY + 20;
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text(`Total metrics: ${data.stats.length}`, 20, finalY);
                doc.text('Report generated automatically', 20, finalY + 10);
                
                // Save the PDF
                doc.save('stats-report.pdf');
            }

            exportAsDocx(data) {
                // Create RTF content that opens in Word
                let rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}`;
                rtfContent += `\\f0\\fs24 `;
                
                // Title
                rtfContent += `{\\b\\fs32 ${data.title}}\\par\\par`;
                rtfContent += `Generated: ${data.timestamp}\\par\\par`;
                
                rtfContent += `{\\b Statistics Summary}\\par\\par`;
                
                // Stats
                data.stats.forEach(stat => {
                    rtfContent += `{\\b ${stat.metric}:} ${stat.value}\\par`;
                    rtfContent += `Trend: ${stat.trend} - ${stat.changeText}\\par\\par`;
                });
                
                rtfContent += `Total metrics: ${data.stats.length}\\par`;
                rtfContent += `}`;

                this.downloadFile(rtfContent, 'stats-report.rtf', 'application/rtf');
            }

            downloadFile(content, filename, contentType) {
                const blob = new Blob([content], { type: contentType });
                const url = window.URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                window.URL.revokeObjectURL(url);
            }

            showSuccessMessage() {
                const successMsg = document.getElementById('xp98stats-success-msg');
                successMsg.style.display = 'flex';
                
                // Scroll success message into view
                successMsg.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }

            resetExportButton() {
                this.isExporting = false;
                const exportBtn = document.getElementById('xp98stats-export-btn');
                exportBtn.disabled = false;
                exportBtn.innerHTML = '<i class="fas fa-download"></i><span id="xp98stats-export-btn-text">Export Report</span>';
            }
        }
                
        // Ensure only one instance is created
        let exporterInstance = null;

        function initializeExporter() {
            if (!exporterInstance) {
                exporterInstance = new XP98StatsExporter();
            }
        }

        // Initialize the exporter when DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeExporter);
        } else {
            initializeExporter();
        }
