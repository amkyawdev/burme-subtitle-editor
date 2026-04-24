/**
 * Burme Subtitle Editor - Application Logic
 * Vue.js 3 Application
 */

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            // Page Navigation
            currentPage: 'home',
            
            // Video Player State
            videoPlayer: null,
            isPlaying: false,
            currentTime: 0,
            videoDuration: 0,
            videoSrc: '',
            
            // Subtitle Data
            subtitles: [],
            selectedSubtitleIndex: -1,
            currentSubtitle: null,
            showSubtitleOverlay: true,
            
            // Playback Controls
            volume: 100,
            isMuted: false,
            playbackSpeed: 1,
            playbackSpeeds: [0.5, 0.75, 1, 1.25, 1.5, 2],
            
            // Dialog State
            showEditDialog: false,
            showGlobalStylesDialog: false,
            editingSubtitle: {
                text: '',
                startTime: '00:00:00,000',
                endTime: '00:00:00,000',
                fontSize: 24,
                fontFamily: 'Inter',
                textColor: '#ffffff',
                bgColor: '#000000',
                bgOpacity: 50,
                position: 'bottom'
            },
            
            // Global Styles for all subtitles
            globalStyles: {
                fontSize: 24,
                fontFamily: 'Inter',
                textColor: '#ffffff',
                bgColor: '#000000',
                bgOpacity: 50,
                position: 'bottom'
            },
            
            // Default subtitle style
            defaultSubtitleStyle: {
                fontSize: '24px',
                fontFamily: 'Inter',
                color: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.5)'
            }
        };
    },
    
    computed: {
        // Video duration in milliseconds for timeline binding
        videoDurationMs() {
            return this.videoDuration * 1000;
        },
        
        // Dynamic subtitle overlay style based on current subtitle
        subtitleOverlayStyle() {
            if (!this.currentSubtitle) return {};
            
            const position = this.currentSubtitle.position || 'bottom';
            return {
                bottom: position === 'bottom' ? '10%' : 'auto',
                top: position === 'top' ? '10%' : 'auto',
                transform: position === 'center' ? 'translateY(-50%)' : 'none'
            };
        },
        
        currentSubtitleStyle() {
            if (!this.currentSubtitle) return this.defaultSubtitleStyle;
            
            const bgOpacity = this.currentSubtitle.bgOpacity || 50;
            const bgColor = this.currentSubtitle.bgColor || '#000000';
            
            // Convert hex to rgba
            const r = parseInt(bgColor.slice(1, 3), 16);
            const g = parseInt(bgColor.slice(3, 5), 16);
            const b = parseInt(bgColor.slice(5, 7), 16);
            
            return {
                fontSize: `${this.currentSubtitle.fontSize || 24}px`,
                fontFamily: this.currentSubtitle.fontFamily || 'Inter',
                color: this.currentSubtitle.textColor || '#ffffff',
                backgroundColor: `rgba(${r}, ${g}, ${b}, ${bgOpacity / 100})`
            };
        }
    },
    
    mounted() {
        // Initialize video player reference
        this.$nextTick(() => {
            this.videoPlayer = this.$refs.videoPlayer;
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeydown);
    },
    
    beforeUnmount() {
        document.removeEventListener('keydown', this.handleKeydown);
    },
    
    methods: {
        // ======================
        // Navigation Methods
        // ======================
        
        navigateTo(page) {
            this.currentPage = page;
        },
        
        // ======================
        // Project Methods
        // ======================
        
        createNewProject() {
            // Reset state
            this.subtitles = [];
            this.selectedSubtitleIndex = -1;
            this.currentTime = 0;
            this.videoSrc = '';
            this.isPlaying = false;
            this.videoPlayer = null;
            
            // Go to edit page
            this.currentPage = 'edit';
            
            // Re-initialize video player after DOM update
            this.$nextTick(() => {
                this.videoPlayer = this.$refs.videoPlayer;
            });
        },
        
        loadSampleProject() {
            // Load sample subtitles for demo
            this.subtitles = [
                {
                    text: 'Welcome to Burme Subtitle Editor',
                    start: 0,
                    end: 3000,
                    fontSize: 24,
                    fontFamily: 'Inter',
                    textColor: '#ffffff',
                    bgColor: '#000000',
                    bgOpacity: 50,
                    position: 'bottom'
                },
                {
                    text: 'Professional subtitle editing made simple',
                    start: 3000,
                    end: 6000,
                    fontSize: 24,
                    fontFamily: 'Inter',
                    textColor: '#ffffff',
                    bgColor: '#000000',
                    bgOpacity: 50,
                    position: 'bottom'
                },
                {
                    text: 'Create, customize, and export with ease',
                    start: 6000,
                    end: 10000,
                    fontSize: 24,
                    fontFamily: 'Inter',
                    textColor: '#ffffff',
                    bgColor: '#000000',
                    bgOpacity: 50,
                    position: 'bottom'
                }
            ];
            
            // Go to edit page
            this.currentPage = 'edit';
        },
        
        // ======================
        // Video Player Methods
        // ======================
        
        onVideoFileSelect(event) {
            const files = event.target.files;
            if (files.length > 0) {
                // Find video and SRT files
                let videoFile = null;
                let srtFile = null;
                
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (file.type.startsWith('video/')) {
                        videoFile = file;
                    } else if (file.name.endsWith('.srt')) {
                        srtFile = file;
                    }
                }
                
                // Load video first
                if (videoFile) {
                    this.loadVideoFile(videoFile);
                }
                
                // Auto-load SRT if found
                if (srtFile) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        this.parseSRT(e.target.result);
                    };
                    reader.readAsText(srtFile);
                } else if (videoFile) {
                    // Show hint about SRT naming
                    const baseName = videoFile.name.replace(/\.[^/.]+$/, '');
                    console.log('Tip: Name your SRT file "' + baseName + '.srt" and select it together with your video file.');
                }
            }
            // Reset input
            event.target.value = '';
        },
        
        onVideoDrop(event) {
            const files = event.dataTransfer.files;
            if (files.length > 0) {
                let videoFile = null;
                let srtFile = null;
                
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (file.type.startsWith('video/')) {
                        videoFile = file;
                    } else if (file.name.endsWith('.srt')) {
                        srtFile = file;
                    }
                }
                
                if (videoFile) {
                    this.loadVideoFile(videoFile);
                }
                
                if (srtFile) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        this.parseSRT(e.target.result);
                    };
                    reader.readAsText(srtFile);
                }
            }
        },
        
        loadVideoFile(file) {
            const url = URL.createObjectURL(file);
            this.videoSrc = url;
            // Wait for video to load then update duration
            this.$nextTick(() => {
                if (this.videoPlayer) {
                    this.videoPlayer.load();
                }
            });
        },
        
        onVideoLoaded() {
            this.videoPlayer = this.$refs.videoPlayer;
            if (this.videoPlayer) {
                this.videoDuration = this.videoPlayer.duration;
            }
        },
        
        onTimeUpdate() {
            if (this.videoPlayer) {
                this.currentTime = this.videoPlayer.currentTime * 1000; // Convert to milliseconds
                
                // Find current subtitle
                this.updateCurrentSubtitle();
            }
        },
        
        updateCurrentSubtitle() {
            const time = this.currentTime;
            this.currentSubtitle = this.subtitles.find(sub => 
                time >= sub.start && time <= sub.end
            );
        },
        
        togglePlay() {
            // Use $nextTick to ensure DOM is ready
            this.$nextTick(() => {
                this.videoPlayer = this.$refs.videoPlayer;
                
                if (!this.videoPlayer) {
                    return;
                }
                
                if (this.isPlaying) {
                    this.videoPlayer.pause();
                } else {
                    this.videoPlayer.play();
                }
                this.isPlaying = !this.isPlaying;
            });
        },
        
        toggleSubtitleOverlay() {
            this.showSubtitleOverlay = !this.showSubtitleOverlay;
        },
        
        skipBackward() {
            this.$nextTick(() => {
                this.videoPlayer = this.$refs.videoPlayer;
                if (this.videoPlayer) {
                    this.videoPlayer.currentTime = Math.max(0, this.videoPlayer.currentTime - 5);
                    this.currentTime = this.videoPlayer.currentTime * 1000;
                }
            });
        },
        
        skipForward() {
            this.$nextTick(() => {
                this.videoPlayer = this.$refs.videoPlayer;
                if (this.videoPlayer) {
                    this.videoPlayer.currentTime = Math.min(this.videoDuration, this.videoPlayer.currentTime + 5);
                    this.currentTime = this.videoPlayer.currentTime * 1000;
                }
            });
        },
        
        toggleMute() {
            this.$nextTick(() => {
                this.videoPlayer = this.$refs.videoPlayer;
                if (this.videoPlayer) {
                    this.isMuted = !this.isMuted;
                    this.videoPlayer.muted = this.isMuted;
                }
            });
        },
        
        setVolume() {
            this.$nextTick(() => {
                this.videoPlayer = this.$refs.videoPlayer;
                if (this.videoPlayer) {
                    this.videoPlayer.volume = this.volume / 100;
                    this.isMuted = this.volume === 0;
                }
            });
        },
        
        cyclePlaybackSpeed() {
            const currentIndex = this.playbackSpeeds.indexOf(this.playbackSpeed);
            const nextIndex = (currentIndex + 1) % this.playbackSpeeds.length;
            this.playbackSpeed = this.playbackSpeeds[nextIndex];
            
            this.$nextTick(() => {
                this.videoPlayer = this.$refs.videoPlayer;
                if (this.videoPlayer) {
                    this.videoPlayer.playbackRate = this.playbackSpeed;
                }
            });
        },
        
        seekVideo() {
            if (!this.videoPlayer) return;
            this.videoPlayer.currentTime = this.currentTime / 1000;
        },
        
        toggleFullscreen() {
            const wrapper = this.$refs.videoPlayer?.parentElement;
            if (!wrapper) return;
            
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                wrapper.requestFullscreen();
            }
        },
        
        formatTime(ms) {
            const totalSeconds = Math.floor(ms / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const milliseconds = Math.floor((ms % 1000));
            
            const pad = (n) => n.toString().padStart(2, '0');
            return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${milliseconds.toString().padStart(3, '0')}`;
        },
        
        parseTime(timeStr) {
            // Parse SRT format time (00:00:00,000) to milliseconds
            const match = timeStr.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
            if (!match) return 0;
            
            const hours = parseInt(match[1]) * 3600;
            const minutes = parseInt(match[2]) * 60;
            const seconds = parseInt(match[3]);
            const milliseconds = parseInt(match[4]);
            
            return (hours + minutes + seconds) * 1000 + milliseconds;
        },
        
        // ======================
        // Subtitle Methods
        // ======================
        
        addNewSubtitle() {
            const currentPos = this.currentTime;
            const newSubtitle = {
                text: 'New subtitle',
                start: currentPos,
                end: currentPos + 3000,
                fontSize: this.globalStyles.fontSize,
                fontFamily: this.globalStyles.fontFamily,
                textColor: this.globalStyles.textColor,
                bgColor: this.globalStyles.bgColor,
                bgOpacity: this.globalStyles.bgOpacity,
                position: this.globalStyles.position
            };
            
            this.subtitles.push(newSubtitle);
            this.selectedSubtitleIndex = this.subtitles.length - 1;
            
            // Open edit dialog
            this.editSubtitle(this.subtitles.length - 1);
        },
        
        applyGlobalStyles() {
            // Apply global styles to all subtitles
            this.subtitles.forEach(sub => {
                sub.fontSize = this.globalStyles.fontSize;
                sub.fontFamily = this.globalStyles.fontFamily;
                sub.textColor = this.globalStyles.textColor;
                sub.bgColor = this.globalStyles.bgColor;
                sub.bgOpacity = this.globalStyles.bgOpacity;
                sub.position = this.globalStyles.position;
            });
        },
        
        selectSubtitle(index) {
            this.selectedSubtitleIndex = index;
            
            // Seek to subtitle start time
            if (this.videoPlayer && this.subtitles[index]) {
                this.videoPlayer.currentTime = this.subtitles[index].start / 1000;
                this.currentTime = this.subtitles[index].start;
            }
        },
        
        editSubtitle(index) {
            const subtitle = this.subtitles[index];
            if (!subtitle) return;
            
            this.editingSubtitle = {
                text: subtitle.text,
                startTime: this.formatTime(subtitle.start),
                endTime: this.formatTime(subtitle.end),
                fontSize: subtitle.fontSize || 24,
                fontFamily: subtitle.fontFamily || 'Inter',
                textColor: subtitle.textColor || '#ffffff',
                bgColor: subtitle.bgColor || '#000000',
                bgOpacity: subtitle.bgOpacity || 50,
                position: subtitle.position || 'bottom'
            };
            
            this.selectedSubtitleIndex = index;
            this.showEditDialog = true;
        },
        
        saveSubtitleChanges() {
            if (this.selectedSubtitleIndex < 0) return;
            
            const sub = this.subtitles[this.selectedSubtitleIndex];
            if (!sub) return;
            
            // Update subtitle
            sub.text = this.editingSubtitle.text;
            sub.start = this.parseTime(this.editingSubtitle.startTime);
            sub.end = this.parseTime(this.editingSubtitle.endTime);
            sub.fontSize = this.editingSubtitle.fontSize;
            sub.fontFamily = this.editingSubtitle.fontFamily;
            sub.textColor = this.editingSubtitle.textColor;
            sub.bgColor = this.editingSubtitle.bgColor;
            sub.bgOpacity = this.editingSubtitle.bgOpacity;
            sub.position = this.editingSubtitle.position;
            
            // Sort subtitles by start time
            this.subtitles.sort((a, b) => a.start - b.start);
            
            // Find new index
            this.selectedSubtitleIndex = this.subtitles.findIndex(s => s === sub);
            
            this.closeEditDialog();
        },
        
        deleteSubtitle(index) {
            if (index < 0 || index >= this.subtitles.length) return;
            
            this.subtitles.splice(index, 1);
            this.selectedSubtitleIndex = -1;
        },
        
        closeEditDialog() {
            this.showEditDialog = false;
            this.selectedSubtitleIndex = -1;
        },
        
        // ======================
        // Export Methods
        // ======================
        
        exportSRT() {
            let srtContent = '';
            
            this.subtitles.forEach((sub, index) => {
                srtContent += `${index + 1}\n`;
                srtContent += `${this.formatTime(sub.start)} --> ${this.formatTime(sub.end)}\n`;
                srtContent += `${sub.text}\n\n`;
            });
            
            // Create downloadable file
            const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'subtitles.srt';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        },
        
        importSRT(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                this.parseSRT(content);
            };
            reader.readAsText(file);
            
            // Reset input
            event.target.value = '';
        },
        
        parseSRT(content) {
            // Reset subtitles
            this.subtitles = [];
            
            // Get video duration for sync check
            const videoDurationMs = this.videoDuration * 1000;
            
            // Normalize line endings
            content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            
            // Split into blocks
            const blocks = content.trim().split(/\n\n+/);
            
            blocks.forEach(block => {
                const lines = block.split('\n');
                if (lines.length < 3) return;
                
                // Parse index (line 0) - may not exist if subtitle text contains blank lines
                let timeLineIndex = 0;
                let textStartIndex = 2;
                
                // Check if first line is a number
                if (/^\d+$/.test(lines[0].trim())) {
                    timeLineIndex = 1;
                    textStartIndex = 2;
                }
                
                // Parse timing line: 00:00:00,000 --> 00:00:00,000
                const timeMatch = lines[timeLineIndex].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
                if (!timeMatch) return;
                
                const startMs = (parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3])) * 1000 + parseInt(timeMatch[4]);
                const endMs = (parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7])) * 1000 + parseInt(timeMatch[8]);
                
                // Get text (remaining lines)
                const text = lines.slice(textStartIndex).join('\n');
                
                this.subtitles.push({
                    text: text,
                    start: startMs,
                    end: endMs,
                    fontSize: this.globalStyles.fontSize,
                    fontFamily: this.globalStyles.fontFamily,
                    textColor: this.globalStyles.textColor,
                    bgColor: this.globalStyles.bgColor,
                    bgOpacity: this.globalStyles.bgOpacity,
                    position: this.globalStyles.position
                });
            });
            
            // Sort by start time
            this.subtitles.sort((a, b) => a.start - b.start);
            
            // Sync check - show warning if SRT times don't match video
            if (videoDurationMs > 0) {
                const lastSub = this.subtitles[this.subtitles.length - 1];
                if (lastSub && lastSub.end > videoDurationMs) {
                    console.warn('SRT file times may not match video duration. Consider adjusting subtitle timings.');
                }
            }
        },
        
        // ======================
        // Keyboard Shortcuts
        // ======================
        
        handleKeydown(e) {
            // Only handle shortcuts when on edit page
            if (this.currentPage !== 'edit') return;
            
            // Ctrl + A - Add subtitle
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                this.addNewSubtitle();
            }
            
            // Ctrl + S - Save (placeholder)
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                // Could implement save to localStorage
            }
            
            // Ctrl + E - Export
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.exportSRT();
            }
            
            // Space - Play/Pause
            if (e.key === ' ' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.togglePlay();
            }
            
            // Delete - Delete selected subtitle
            if (e.key === 'Delete' && this.selectedSubtitleIndex >= 0) {
                this.deleteSubtitle(this.selectedSubtitleIndex);
            }
            
            // Arrow Up - Previous subtitle
            if (e.key === 'ArrowUp' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                const currentIdx = this.selectedSubtitleIndex;
                if (currentIdx > 0) {
                    this.selectSubtitle(currentIdx - 1);
                }
            }
            
            // Arrow Down - Next subtitle
            if (e.key === 'ArrowDown' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                const currentIdx = this.selectedSubtitleIndex;
                if (currentIdx < this.subtitles.length - 1) {
                    this.selectSubtitle(currentIdx + 1);
                }
            }
        }
    }
});

// Mount the app
app.mount('#app');