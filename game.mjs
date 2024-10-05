import { print, askQuestion } from "./io.mjs"
import { ANSI } from "./ansi.mjs";
import DICTIONARY from "./language.mjs";
import showSplashScreen from "./splash.mjs";

const GAME_BOARD_SIZE = 3;     
const PLAYER_1 = 1;            
const PLAYER_2 = -1;         
const WIN_CONDITION = 3;       
const DRAW_RESULT = 0.5;       


const MENU_CHOICES = {
    MENU_CHOICE_START_GAME: 1,
    MENU_CHOICE_SHOW_SETTINGS: 2,
    MENU_CHOICE_EXIT_GAME: 3,
    MENU_CHOICE_PVC_MODE: 4  
};


const NO_CHOICE = -1;

let language = DICTIONARY.en;
let gameboard;
let currentPlayer;


clearScreen();
showSplashScreen();
setTimeout(start, 2500); // This waites 2.5seconds before calling the function. i.e. we get to see the splash screen for 2.5 seconds before the menue takes over. 



//#region game functions -----------------------------

async function start() {
    do {
        let chosenAction = NO_CHOICE;
        chosenAction = await showMenu();

        if (chosenAction == MENU_CHOICES.MENU_CHOICE_START_GAME) {
            await runGame(false);  // False indicates PvP
        } else if (chosenAction == MENU_CHOICES.MENU_CHOICE_SHOW_SETTINGS) {
            ///TODO: Needs implementing
        } else if (chosenAction == MENU_CHOICES.MENU_CHOICE_PVC_MODE) {
            await runGame(true);  // True indicates PvC
        } else if (chosenAction == MENU_CHOICES.MENU_CHOICE_EXIT_GAME) {
            clearScreen();
            process.exit();
        }
    } while (true);
}

async function runGame(isPvC) {
    let isPlaying = true;

    while (isPlaying) {  // Do the following until the player dos not want to play anymore. 
        initializeGame(); // Reset everything related to playing the game
        isPlaying = await playGame(isPvC);  
    }
}

async function showMenu() {

    let choice = -1;  // This variable tracks the choice the player has made. We set it to -1 initially because that is not a valid choice.
    let validChoice = false;    // This variable tells us if the choice the player has made is one of the valid choices. It is initially set to false because the player has made no choices.

    while (!validChoice) {
        clearScreen();
        print(ANSI.COLOR.YELLOW + "MENU" + ANSI.RESET);
        print(language.MENU_PLAY);  // Play Game
        print(language.MENU_SETTINGS);  // Settings
        print(language.MENU_EXIT);  // Exit Game
        print(language.MENU_PVC);  // Play against Computer in the selected language

        choice = await askQuestion("");

        if ([MENU_CHOICES.MENU_CHOICE_START_GAME, MENU_CHOICES.MENU_CHOICE_SHOW_SETTINGS, MENU_CHOICES.MENU_CHOICE_EXIT_GAME, MENU_CHOICES.MENU_CHOICE_PVC_MODE].includes(Number(choice))) {
            validChoice = true;
        }

        if (choice == MENU_CHOICES.MENU_CHOICE_SHOW_SETTINGS) {
            await showSettings();  
        }
    }

    return choice;
}

async function showSettings() {
    clearScreen();
    print(language.LANGUAGE_SELECTION);   

    let langChoice = await askQuestion("");

    if (langChoice === "1") {
        language = DICTIONARY.en;   
    } else if (langChoice === "2") {
        language = DICTIONARY.no;   
    }


    print(ANSI.COLOR.GREEN + "Language changed successfully!" + ANSI.RESET);

   
    await askQuestion("Press Enter to return to the menu...");
}


async function playGame(isPvC) {
    let outcome;
    do {
        clearScreen();
        showGameBoardWithCurrentState();
        showHUD();

        if (isPvC && currentPlayer == PLAYER_2) {
            let move = getComputerMove();
            if (move) {
                updateGameBoardState(move);
            }
        } else {
            let move = await getGameMoveFromtCurrentPlayer();
            updateGameBoardState(move);
        }

        outcome = evaluateGameState();
        changeCurrentPlayer();
    } while (outcome == 0);

    showGameSummary(outcome);
    return await askWantToPlayAgain();
}


async function askWantToPlayAgain() {
    let answer = await askQuestion(language.PLAY_AGAIN_QUESTION);
    let playAgain = true;
    if (answer && answer.toLowerCase()[0] != language.CONFIRM) {
        playAgain = false;
    }
    return playAgain;
}

function getComputerMove() {
    let availableMoves = [];

    for (let row = 0; row < GAME_BOARD_SIZE; row++) {
        for (let col = 0; col < GAME_BOARD_SIZE; col++) {
            if (gameboard[row][col] === 0) {
                availableMoves.push([row, col]);  
            }
        }
    }

    if (availableMoves.length > 0) {
        let randomIndex = Math.floor(Math.random() * availableMoves.length);
        return availableMoves[randomIndex];
    }

    return null;  
}


function showGameSummary(outcome) {
    clearScreen();
    if (outcome === 0.5) {
        print(language.DRAW); 
    } else {
        let winningPlayerMessage = (outcome > 0) ? language.PLAYER_ONE_WIN : language.PLAYER_TWO_WIN;
        print(winningPlayerMessage);  
    }
    showGameBoardWithCurrentState();
    print(language.GAME_OVER);   
}

function changeCurrentPlayer() {
    currentPlayer *= -1;
}

function evaluateGameState() {
    let sum = 0;
    let state = 0;
    let isBoardFull = true;

    for (let row = 0; row < GAME_BOARD_SIZE; row++) {
        for (let col = 0; col < GAME_BOARD_SIZE; col++) {
            sum += gameboard[row][col];

            if (gameboard[row][col] === 0) {
                isBoardFull = false;
            }
        }

        if (Math.abs(sum) == WIN_CONDITION) {
            state = sum;
        }
        sum = 0;
    }

    for (let col = 0; col < GAME_BOARD_SIZE; col++) {
        for (let row = 0; row < GAME_BOARD_SIZE; row++) {
            sum += gameboard[row][col];
        }

        if (Math.abs(sum) == WIN_CONDITION) {
            state = sum;
        }
        sum = 0;
    }

    for (let i = 0; i < GAME_BOARD_SIZE; i++) {
        sum += gameboard[i][i];
    }
    if (Math.abs(sum) == WIN_CONDITION) {
        state = sum;
    }
    sum = 0;

    for (let i = 0; i < GAME_BOARD_SIZE; i++) {
        sum += gameboard[i][GAME_BOARD_SIZE - 1 - i];
    }
    if (Math.abs(sum) == WIN_CONDITION) {
        state = sum;
    }

    if (state !== 0) {
        return state / WIN_CONDITION;
    } else if (isBoardFull) {
        return DRAW_RESULT;  
    } else {
        return 0;
    }
}



function updateGameBoardState(move) {
    const ROW_ID = 0;
    const COLUMN_ID = 1;
    gameboard[move[ROW_ID]][move[COLUMN_ID]] = currentPlayer;
}

async function getGameMoveFromtCurrentPlayer() {
    let position = null;
    do {
        let rawInput = await askQuestion("Place your mark at (e.g., '1 1'): ");
        let inputArray = rawInput.split(" ");
        
        if (inputArray.length !== 2) {
            console.log("Please enter two numbers separated by a space.");
            continue;
        }
        position = inputArray.map(Number);

        if (isNaN(position[0]) || isNaN(position[1])) {
            console.log("Invalid input. Please enter valid numbers.");
            position = null;  
        }

    
        position[0] -= 1;
        position[1] -= 1;

    } while (isValidPositionOnBoard(position) == false)

    return position;
}


function isValidPositionOnBoard(position) {

    if (position.length < 2) {
        // We where not given two numbers or more.
        return false;
    }

    let isValidInput = true;
    if (position[0] * 1 != position[0] && position[1] * 1 != position[1]) {
        // Not Numbers
        inputWasCorrect = false;
    } else if (position[0] > GAME_BOARD_SIZE && position[1] > GAME_BOARD_SIZE) {
        // Not on board
        inputWasCorrect = false;
    }
    else if (Number.parseInt(position[0]) != position[0] && Number.parseInt(position[1]) != position[1]) {
        // Position taken.
        inputWasCorrect = false;
    }


    return isValidInput;
}

function showHUD() {
    if (currentPlayer == PLAYER_1) {
        print(language.PLAYER_ONE_TURN); 
    } else {
        print(language.PLAYER_TWO_TURN);   
    }
}

function showGameBoardWithCurrentState() {
    for (let currentRow = 0; currentRow < GAME_BOARD_SIZE; currentRow++) {
        let rowOutput = "";
        for (let currentCol = 0; currentCol < GAME_BOARD_SIZE; currentCol++) {
            let cell = gameboard[currentRow][currentCol];
            if (cell == 0) {
                rowOutput += "_ ";
            }
            else if (cell > 0) {
                rowOutput += "X ";
            } else {
                rowOutput += "O  ";
            }
        }

        print(rowOutput);
    }
}

function initializeGame() {
    gameboard = createGameBoard();
    currentPlayer = PLAYER_1;
}

function createGameBoard() {

    let newBoard = new Array(GAME_BOARD_SIZE);

    for (let currentRow = 0; currentRow < GAME_BOARD_SIZE; currentRow++) {
        let row = new Array(GAME_BOARD_SIZE);
        for (let currentColumn = 0; currentColumn < GAME_BOARD_SIZE; currentColumn++) {
            row[currentColumn] = 0;
        }
        newBoard[currentRow] = row;
    }

    return newBoard;

}

function clearScreen() {
    console.log(ANSI.CLEAR_SCREEN, ANSI.CURSOR_HOME, ANSI.RESET);
}


//#endregion

