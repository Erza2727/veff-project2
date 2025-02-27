const backendUrl = "http://localhost:3000/api/v1/game-state";
import axios from "axios";
import * as Tone from "tone";

// Game state variables
const gameState = {
    sequence: [],       // Holds the correct sequence
    userInput: [],      // Holds player's input
    level: 1,          // Current level
    highScore: 0       // High score
};

// DOM Elements
const startButton = document.getElementById("start-btn");
const replayButton = document.getElementById("replay-btn");
const highScoreDisplay = document.getElementById("high-score");
const gamePads = document.querySelectorAll(".pad");  // Pads for input
const failurMessige = document.getElementById("failure-modal");
const resetButton = document.getElementById("reset-btn");
const dropdown = document.getElementById("sound-select");
const synth = new Tone.Synth().toDestination();
synth.oscillator.type = dropdown.value;



// Resets game state by contacting backend
async function resetGameState() {
    console.log("Resetting Game State");
    try {
        let response = await axios.put(`${backendUrl}`);
        let data = response.data;

        gameState.sequence = data.gameState.sequence;
        gameState.level = data.gameState.level;
        gameState.highScore = data.gameState.highScore || 0;  // Default to 0 if not provided
        highScoreDisplay.textContent = data.gameState.highScore;

        startButton.disabled = false;
        replayButton.disabled = true;
        gamePads.forEach((pad)=>{pad.disabled=true})

    } catch (error) {
        console.error("Error resetting game state:", error);
    }
}

// Starts the game when start button is clicked
function startGame() {
    startButton.disabled = true;
    replayButton.disabled = false;
    gamePads.forEach((pad)=>{pad.disabled=false})

    //gameState.sequence = [Math.floor(Math.random() * 4)];  // Start with 1 random color
    playSequence();
}

// Plays the sequence by lighting up pads
function playSequence() {
    let delay = 500; // Time delay between lights

    gameState.sequence.forEach((padName, i) => {
       
        setTimeout(() => {
            flashPad(getColorIndex(padName));
            playSound(getColorIndex(padName));
        }, i * delay);
    });

    gameState.userInput = [];  // Reset user input for new round
}

// Flashes a pad when playing sequence
function flashPad(index) {

    gamePads[index].classList.add("active");
    setTimeout(() => gamePads[index].classList.remove("active"), 300);
}

// Plays the corresponding sound for each pad
function playSound(index) {    
    const tones = ["C4", "D4", "E4", "F4"]; // Tone mapping
    synth.triggerAttackRelease(tones[index], "8n");
}

async function handlePadClick(event) {
    if (startButton.disabled === false) return; // Prevent clicking if Start is not pressed
    await clickPad(event.target) 
}
// Handles user clicking a pad
async function clickPad(pad) {
    let index = parseInt(pad.dataset.index);
    gameState.userInput.push(index);
    flashPad(index);
    playSound(index);

    // Check if user input is complete
    if (gameState.userInput.length === gameState.sequence.length) {
        await validateInput();
    }
}

// Validates user input against sequence
async function validateInput() {
    let response;
    try {
        response = await axios.post(`${backendUrl}/sequence`, {
            sequence: gameState.userInput.map(getColorName)
        });

        let data = response.data.gameState;

        gameState.level = data.level;
        gameState.highScore = data.highScore
        gameState.sequence = data.sequence;
        highScoreDisplay.textContent = gameState.highScore;

        // Add a new random color to sequence
        //gameState.sequence.push(Math.floor(Math.random() * 4));
        gameState.userInput = [];

        setTimeout(playSequence, 1000);
    } catch (error) {
        if (error.status == 400) {
            failurMessige.style.display = "flex";
            resetButton.addEventListener("click", () => {
                failurMessige.style.display = "none";
                resetGameState()
            })

        }
        else {
            console.error("Error validating sequence:", error);
        }
    }

}

// Converts pad index to color name
function getColorName(index) {
    const colors = ["red", "yellow", "green", "blue"];
    return colors[index];
}

function getColorIndex(colorName) {
    const colors = ["red", "yellow", "green", "blue"];
    return colors.indexOf(colorName);
}

function getkeyindex(keyname){
    const key = ["q", "w", "a", "s"]
    return key.indexOf(keyname);
}

function handleKeydown(event){
    if (startButton.disabled === false) return; // Prevent key presses before Start

    const index = getkeyindex(event.key); // Gets pad index if key is correct, otherwise -1
    if (index != -1){
        gamePads[index].dataset.index = index;
        clickPad(gamePads[index])
    }

}

// Adds event listeners
window.addEventListener("keydown", handleKeydown);

// Reset game when the page loads
window.addEventListener("load", resetGameState);

dropdown.addEventListener("change",()=>{
    synth.oscillator.type = dropdown.value;
})

startButton.addEventListener("click", startGame);
replayButton.addEventListener("click", playSequence);

gamePads.forEach((pad, index) => {
    pad.dataset.index = index;
    pad.addEventListener("click", handlePadClick);
});



