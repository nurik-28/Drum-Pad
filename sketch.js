// --- Global Variables ---
// We will now use an object to map track names to required files
const TRACK_INFO = [
    { name: 'Kick', soundFile: 'sound1.mp3', imageFile: 'kick.png' },
    { name: 'Snare', soundFile: 'sound2.mp3', imageFile: 'snare.png' },
    { name: 'HiHat', soundFile: 'sound3.mp3', imageFile: 'hihat.png' },
    { name: 'Ride', soundFile: 'sound4.mp3', imageFile: 'ride.png' },
    { name: 'Crash', soundFile: 'sound5.mp3', imageFile: 'crash.png' },
    { name: 'Tom 1', soundFile: 'sound6.mp3', imageFile: 'tom1.png' },
    { name: 'Tom 2', soundFile: 'sound7.mp3', imageFile: 'tom2.png' },
    { name: 'Tom 3', soundFile: 'sound8.mp3', imageFile: 'tom3.png' }
];

const NUM_TRACKS = TRACK_INFO.length; 
let sounds = [];        // Array to hold the loaded p5.SoundFile objects
let vinylImages = [];   // Array to hold the loaded p5.Image objects
let nuriLogo;           // Variable for the Nuri logo image

// Sequencer Timing
const BPM = 120;
let loopLength = 4; 
const STEPS_PER_BEAT = 4; 
let stepDuration; 
let totalSteps; 
let currentStep = 0; 
let lastStepTime = 0; 

// Control arrays: one element for each of the 8 tracks/rows
let isPlaying = []; 
let sequences = []; 
let trackRates = []; 
let masterVolume = 0.8; 
let loopToggleIndex = 0; 

// Playback Feedback
let playheadGlow = []; 

// --- Layout Constants ---
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 850; 
const MARGIN = 30;
const BUTTON_H = 40;
const CONTROL_W = 70;
const TITLE_BAR_H = 100; // Height of the title bar

// Sequencer Layout
const SEQ_LABEL_W = 150; 
const SEQ_GRID_X = MARGIN; 
const SEQ_GRID_Y = 150;
const SEQ_STEP_SIZE = 35; 
const SEQ_STEP_SPACING = 10;
const SEQ_TRACK_H = 50; 

// Pitch Slider Constants
const PITCH_RANGE = 0.5; 
const PITCH_SLIDER_W = 100; 
const PITCH_SLIDER_X_OFFSET = 40; 

// --- 1. Preload: Load Assets and Initialize ---
function preload() {
    
    // Load the Nuri Logo Image
    nuriLogo = loadImage('Nuri.png');

    // --- Load Sounds and Images via MAPPED NAMES ---
    for (let i = 0; i < NUM_TRACKS; i++) {
        const info = TRACK_INFO[i];
        
        // 1. Load Sound File
        sounds.push(loadSound(info.soundFile));
        
        // 2. Load Image File
        vinylImages.push(loadImage(info.imageFile)); 

        // 3. Initialize Controls
        isPlaying.push(false);
        trackRates.push(1.0); 
        playheadGlow.push(0);
        sequences.push(Array(16).fill(null)); 
    }
}

// --- 2. Setup: Canvas and Timing ---
function setup() {
    createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT); 
    background(30); 
    updateTiming(); 
}

// Function to update sequencer timing based on loopLength
function updateTiming() {
    let beatDurationInMs = 60000 / BPM; 
    let stepDurationInBeats = 1 / STEPS_PER_BEAT; 
    stepDuration = beatDurationInMs * stepDurationInBeats; 
    totalSteps = loopLength * STEPS_PER_BEAT;
    
    // Resize sequences
    for (let r = 0; r < NUM_TRACKS; r++) {
        sequences[r].length = totalSteps;
        for (let s = 0; s < totalSteps; s++) {
            if (sequences[r][s] === undefined) {
                sequences[r][s] = null;
            }
        }
    }
    currentStep = 0;
    lastStepTime = millis();
}


// --- 3. Main Loop: Draw and Sequencer Logic ---
function draw() {
    background(30); 

    // Sequencer Clock Logic
    if (millis() - lastStepTime >= stepDuration) {
        lastStepTime = millis();
        currentStep = (currentStep + 1) % totalSteps;
        triggerSequencerStep(currentStep);
    }
    
    // Playback Glow Decay
    for (let i = 0; i < NUM_TRACKS; i++) {
        playheadGlow[i] = max(0, playheadGlow[i] - 0.1); 
    }

    drawTitleBar();
    drawSequencerMode();
}

// --- 4. Sequencer Logic: Playback ---
function triggerSequencerStep(step) {
    for (let r = 0; r < NUM_TRACKS; r++) { 
        if (isPlaying[r]) {
            let soundIndex = sequences[r][step];
            if (soundIndex !== null) {
                if (sounds[soundIndex] && sounds[soundIndex].isLoaded()) {
                    sounds[soundIndex].setVolume(masterVolume); 
                    sounds[soundIndex].rate(trackRates[r]);
                    sounds[soundIndex].play();
                    playheadGlow[r] = 1; 
                }
            }
        }
    }
}

// --- 5. Input Functions ---

function keyPressed() {
    if (typeof userStartAudio === 'function') {
        userStartAudio(); 
    }
    return true; 
}

function mousePressed() {
    if (typeof userStartAudio === 'function') {
        userStartAudio(); 
    }
    
    // --- Top Control Checks ---
    let buttonY = MARGIN; 
    
    // Reset Button Check (Side by side)
    let resetButtonX = CANVAS_WIDTH - MARGIN - CONTROL_W * 2 - 5 - CONTROL_W * 2;
    if (mouseX > resetButtonX && mouseX < resetButtonX + CONTROL_W * 2 &&
        mouseY > buttonY && mouseY < buttonY + BUTTON_H) {
        resetSequencer();
        return;
    }

    // Loop Length Button Check (Side by side)
    let loopButtonX = CANVAS_WIDTH - MARGIN - CONTROL_W * 2;
    if (mouseX > loopButtonX && mouseX < loopButtonX + CONTROL_W * 2 &&
        mouseY > buttonY && mouseY < buttonY + BUTTON_H) {
        const loopOptions = [4, 8, 16]; 
        loopToggleIndex = (loopToggleIndex + 1) % loopOptions.length;
        loopLength = loopOptions[loopToggleIndex];
        updateTiming();
        return;
    }
    
    // --- Sequencer Specific Clicks ---
    const gridOffsetX = SEQ_GRID_X + SEQ_LABEL_W + CONTROL_W + 5; 
    const stepGridEnd = gridOffsetX + totalSteps * (SEQ_STEP_SIZE + SEQ_STEP_SPACING);

    for (let r = 0; r < NUM_TRACKS; r++) {
        let rowY = SEQ_GRID_Y + r * SEQ_TRACK_H;

        // Track Pitch Sliders Check (Horizontal)
        let sliderX = stepGridEnd + PITCH_SLIDER_X_OFFSET;
        let sliderY = rowY + SEQ_TRACK_H / 2 - 5; 
        if (checkSlider(sliderX, sliderY, PITCH_SLIDER_W, 10)) {
            trackRates[r] = map(mouseX, sliderX, sliderX + PITCH_SLIDER_W, 1 - PITCH_RANGE, 1 + PITCH_RANGE);
            return;
        }

        // Play/Stop Button Check (Left of grid)
        let playButtonX = SEQ_GRID_X + SEQ_LABEL_W;
        let playButtonY = rowY + 10;
        if (mouseX > playButtonX && mouseX < playButtonX + CONTROL_W &&
            mouseY > playButtonY && mouseY < playButtonY + BUTTON_H / 2) {
            isPlaying[r] = !isPlaying[r];
            return;
        }

        // Sequencer Step Click Check 
        for (let s = 0; s < totalSteps; s++) {
            let stepCenterX = gridOffsetX + s * (SEQ_STEP_SIZE + SEQ_STEP_SPACING) + SEQ_STEP_SIZE / 2;
            let stepCenterY = rowY + SEQ_TRACK_H / 2;
            
            if (dist(mouseX, mouseY, stepCenterX, stepCenterY) < SEQ_STEP_SIZE / 2) {
                let soundIndex = r; 
                sequences[r][s] = (sequences[r][s] === null) ? soundIndex : null;
                return;
            }
        }
    }
}

// Function to check if mouse is over a slider area (used for pitch)
function checkSlider(x, y, w, h) {
    return mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
}

// Function to reset all sequences
function resetSequencer() {
    isPlaying = Array(NUM_TRACKS).fill(false);
    currentStep = 0;
    for (let r = 0; r < NUM_TRACKS; r++) {
        sequences[r] = Array(totalSteps).fill(null);
    }
}


// --- 7. Drawing Functions: UI & Sequencer ---

function drawTitleBar() {
    
    // Draw the main dark bar background
    fill(40);
    noStroke();
    rect(0, 0, CANVAS_WIDTH, TITLE_BAR_H);

    // --- MODIFIED: Draw the Nuri Logo Image with maximized height and centering ---
    if (nuriLogo && nuriLogo.width > 0) {
        
        // Define desired maximum height for the logo (80% of the bar height)
        const MAX_LOGO_HEIGHT = 250; 
        
        // Calculate the proportional width based on the desired height
        let logoHeight = min(MAX_LOGO_HEIGHT, nuriLogo.height);
        let logoWidth = nuriLogo.width * (logoHeight / nuriLogo.height);
        
        // Calculate Y position to center the logo vertically in the 100px bar
        let logoY = (TITLE_BAR_H / 2) - (logoHeight / 2);
        
        imageMode(CORNER);
        // Draw the image at the left margin
        image(nuriLogo, MARGIN, logoY, logoWidth, logoHeight);
    }
    
    // Reset Button (Side by side)
    let buttonY = MARGIN; 
    let resetButtonX = CANVAS_WIDTH - MARGIN - CONTROL_W * 2 - 5 - CONTROL_W * 2;
    drawButton(resetButtonX, buttonY, CONTROL_W * 2, BUTTON_H, 
               'RESET ALL', color(255, 150, 0));
               
    // Loop Length Button (Side by side)
    let loopButtonX = CANVAS_WIDTH - MARGIN - CONTROL_W * 2;
    drawButton(loopButtonX, buttonY, CONTROL_W * 2, BUTTON_H, 
               `LOOP: ${loopLength} STEPS`, color(100, 150, 255));
}

function drawSequencerMode() {
    
    const gridOffsetX = SEQ_GRID_X + SEQ_LABEL_W + CONTROL_W + 5; 
    const stepGridEnd = gridOffsetX + totalSteps * (SEQ_STEP_SIZE + SEQ_STEP_SPACING);
    
    // Draw step numbers above the grid
    for (let s = 0; s < totalSteps; s++) {
        let stepX = gridOffsetX + s * (SEQ_STEP_SIZE + SEQ_STEP_SPACING) + SEQ_STEP_SIZE / 2;
        fill(255);
        textSize(12);
        textAlign(CENTER, BOTTOM);
        text(`${floor(s / STEPS_PER_BEAT) + 1}`, stepX, SEQ_GRID_Y - 10); 
        
        fill(100);
        if (s % STEPS_PER_BEAT !== 0) {
            text(`${s % STEPS_PER_BEAT}`, stepX, SEQ_GRID_Y + 10);
        }
    }

    // Draw the Sequencer Grid and Controls
    for (let r = 0; r < NUM_TRACKS; r++) {
        let rowY = SEQ_GRID_Y + r * SEQ_TRACK_H;

        // Draw Track Label (Left Side)
        textSize(18);
        fill(255);
        textAlign(LEFT, CENTER);
        text(TRACK_INFO[r].name, SEQ_GRID_X + 5, rowY + SEQ_TRACK_H / 2);

        // Play Button (Middle Left)
        let playButtonX = SEQ_GRID_X + SEQ_LABEL_W;
        let playButtonY = rowY + 10;
        drawButton(playButtonX, playButtonY, CONTROL_W, BUTTON_H / 2, 
                   isPlaying[r] ? 'STOP' : 'PLAY', 
                   isPlaying[r] ? color(255, 50, 50) : color(50, 200, 50));

        // Draw Sequencer Steps
        for (let s = 0; s < totalSteps; s++) {
            let stepCenterX = gridOffsetX + s * (SEQ_STEP_SIZE + SEQ_STEP_SPACING) + SEQ_STEP_SIZE / 2;
            let stepCenterY = rowY + SEQ_TRACK_H / 2;
            let isNoteOn = (sequences[r][s] !== null);
            let isCurrentStep = (s === currentStep && isPlaying[r]);

            push();
            translate(stepCenterX, stepCenterY);
            
            // 1. Draw Base Circle 
            let baseColor = color(0);
            
            if (mouseX > (stepCenterX - SEQ_STEP_SIZE/2) && mouseX < (stepCenterX + SEQ_STEP_SIZE/2) &&
                mouseY > (stepCenterY - SEQ_STEP_SIZE/2) && mouseY < (stepCenterY + SEQ_STEP_SIZE/2)) {
                baseColor = color(40); // Hover state: Dark Grey
            }
            
            if (isCurrentStep) {
                 baseColor = color(50 + playheadGlow[r] * 50); 
            }

            fill(baseColor);
            noStroke();
            ellipse(0, 0, SEQ_STEP_SIZE, SEQ_STEP_SIZE);
            
            // 2. Draw VINYL IMAGE (Only if Active/Note On)
            if (isNoteOn) {
                if (vinylImages[r] && vinylImages[r].width > 0) {
                    imageMode(CENTER);
                    
                    let vinylSize = SEQ_STEP_SIZE * 0.9; 
                    
                    if (isCurrentStep) {
                        vinylSize *= (1 + playheadGlow[r] * 0.1); 
                    }
                    
                    image(vinylImages[r], 0, 0, vinylSize, vinylSize);
                }
            }

            // 3. Draw Beat Division Line 
            if (s % STEPS_PER_BEAT === 0) {
                stroke(255, 50); 
                strokeWeight(1);
                noFill();
                ellipse(0, 0, SEQ_STEP_SIZE, SEQ_STEP_SIZE);
            }

            pop();
        }
        
        // Draw Track Pitch Sliders (Horizontal)
        let sliderX = stepGridEnd + PITCH_SLIDER_X_OFFSET;
        let sliderY = rowY + SEQ_TRACK_H / 2 - 5; 
        drawPitchSlider(sliderX, sliderY, PITCH_SLIDER_W, 10, trackRates[r]);
        
        // Display Pitch Value
        textSize(12);
        fill(255);
        textAlign(LEFT, CENTER);
        
        let displayPitch = trackRates[r] - 1.0;
        let pitchColor;
        if (displayPitch > 0.001) {
            pitchColor = color(100, 200, 255); 
        } else if (displayPitch < -0.001) {
            pitchColor = color(255, 100, 100);
        } else { 
            pitchColor = color(200);
        }
        
        fill(pitchColor);
        text(`Pitch: ${nf(displayPitch, 1, 2)}`, sliderX + PITCH_SLIDER_W + 10, sliderY + 5);
    }
}

// Helper function to draw a button
function drawButton(x, y, w, h, label, btnColor) {
    fill(btnColor);
    noStroke();
    rect(x, y, w, h, 5); 

    fill(255);
    textSize(18);
    textAlign(CENTER, CENTER);
    text(label, x + w / 2, y + h / 2);
    
    // Mouse hover effect
    if (mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h) {
        stroke(255);
        strokeWeight(2);
        noFill();
        rect(x, y, w, h, 5);
    }
}

// Helper function to draw the PITCH slider
function drawPitchSlider(x, y, w, h, rate) {
    // Track
    fill(50);
    rect(x, y, w, h);
    
    // Draw the center line (neutral pitch)
    stroke(100);
    line(x + w / 2, y, x + w / 2, y + h);
    noStroke();
    
    // Calculate handle position based on rate (range 1 - PITCH_RANGE to 1 + PITCH_RANGE)
    let handleX = map(rate, 1 - PITCH_RANGE, 1 + PITCH_RANGE, x, x + w);
    
    let pitchColor;
    if (rate > 1.001) { 
        pitchColor = color(100, 200, 255); 
    } else if (rate < 0.999) { 
        pitchColor = color(255, 100, 100);
    } else { 
        pitchColor = color(200);
    }

    // Handle
    fill(pitchColor);
    ellipse(handleX, y + h / 2, h * 1.5, h * 1.5);
}