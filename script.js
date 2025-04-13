document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const VOTE_NAMESPACE = 'debate-timer-final'; // Unique ID for our counters
    const API_BASE_URL = 'https://api.counterapi.dev/v1';
    const COUNTER_PEACE_KEY = 'peace';
    const COUNTER_WAR_KEY = 'war';
    const INITIAL_TIME = 90; // 90 seconds

    // --- DOM Element References ---
    const timerDisplay = document.getElementById('timer');
    const initialStateDiv = document.getElementById('initial-state');
    const choiceStateDiv = document.getElementById('choice-state');
    const resultStateDiv = document.getElementById('result-state');
    const resultMessage = document.getElementById('result-message');
    const peaceBtn = document.getElementById('peaceBtn');
    const warBtn = document.getElementById('warBtn');
    const body = document.getElementById('body-main');
    const voteCountsDiv = document.getElementById('vote-counts');
    const peaceCountSpan = document.getElementById('peace-count');
    const warCountSpan = document.getElementById('war-count');
    const voteErrorP = document.getElementById('vote-error');
    const loadingIndicator = document.getElementById('loading-indicator');

    // --- State Variables ---
    let timeLeft = INITIAL_TIME;
    let timerInterval = null;
    let buttonsEnabled = false; // Track if buttons are ready

    // --- API Interaction Functions ---

    // Function to hit the counter API (increment or get value)
    async function hitCounterAPI(key, action = 'get') {
        // Action can be 'get' or 'up'
        const endpoint = action === 'up' ? `${key}/up` : `${key}/`;
        const url = `${API_BASE_URL}/${VOTE_NAMESPACE}/${endpoint}`;
        try {
            console.log(`Fetching: ${url}`); // Log the URL being fetched
            const response = await fetch(url);
            if (!response.ok) {
                // Throw error if response is not successful (e.g., 4xx, 5xx)
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
             console.log(`Response for ${key} (${action}):`, data); // Log the response data
             // The API returns `count` for 'get' and sometimes `new_count` or similar for 'up',
             // but we mainly care about the count value itself.
            return data.count !== undefined ? data.count : (data.value !== undefined ? data.value : 0);
        } catch (error) {
            console.error(`Failed to ${action} counter ${key}:`, error);
            voteErrorP.style.display = 'block'; // Show error message
            return null; // Return null on failure
        }
    }

    // --- UI Update Functions ---

    // Function to format time as MM:SS
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Function to update the displayed vote counts
    function displayVoteCounts(peaceVotes, warVotes) {
         peaceCountSpan.textContent = `За мир: ${peaceVotes !== null ? peaceVotes : 'Ошибка'}`;
         warCountSpan.textContent = `Против мира: ${warVotes !== null ? warVotes : 'Ошибка'}`;
         voteCountsDiv.style.display = 'block'; // Ensure counts are visible
    }

     // Function to enable/disable voting buttons and show loading
    function setButtonsState(enabled) {
        buttonsEnabled = enabled;
        peaceBtn.disabled = !enabled;
        warBtn.disabled = !enabled;
        if(loadingIndicator) {
            loadingIndicator.style.display = enabled ? 'none' : 'block';
        }
    }


    // --- Core Logic Functions ---

    // Function to stop the timer and show choices (but disable buttons initially)
    function stopTimer() {
        clearInterval(timerInterval);
        initialStateDiv.style.display = 'none';
        choiceStateDiv.style.display = 'block';
        resultStateDiv.style.display = 'none'; // Hide result area
        setButtonsState(true); // Enable buttons now timer is done
    }

    // Function to start the timer
    function startTimer() {
        timeLeft = INITIAL_TIME;
        timerDisplay.textContent = formatTime(timeLeft);
        initialStateDiv.style.display = 'block';
        choiceStateDiv.style.display = 'none';
        resultStateDiv.style.display = 'none';
        body.className = ''; // Reset theme
        voteErrorP.style.display = 'none'; // Hide previous errors
        setButtonsState(false); // Buttons disabled during timer

        timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = formatTime(timeLeft);
            if (timeLeft < 0) {
                stopTimer();
            }
        }, 1000);
    }

    // Function to handle a user's vote
    async function handleVote(choice) {
        if (!buttonsEnabled) return; // Prevent voting if buttons not ready

        setButtonsState(false); // Disable buttons immediately to prevent double clicks
        choiceStateDiv.style.display = 'none'; // Hide choice buttons
        resultStateDiv.style.display = 'block'; // Show result area (counts will appear soon)
        voteErrorP.style.display = 'none'; // Hide error initially

        const counterKey = choice === 'peace' ? COUNTER_PEACE_KEY : COUNTER_WAR_KEY;
        const themeClass = choice === 'peace' ? 'peace-theme' : 'war-theme';
        const resultText = choice === 'peace' ? 'Вы выбрали МИР! 🕊️' : 'Вы выбрали... другую сторону. 🩸';

        // Apply theme immediately
        body.className = themeClass;
        resultMessage.innerHTML = resultText;

        // 1. Increment the chosen counter
        await hitCounterAPI(counterKey, 'up');

        // 2. Get current counts for BOTH counters AFTER incrementing
        // Use Promise.all to fetch both counts concurrently
        const [peaceVotes, warVotes] = await Promise.all([
            hitCounterAPI(COUNTER_PEACE_KEY, 'get'),
            hitCounterAPI(COUNTER_WAR_KEY, 'get')
        ]);

        // 3. Display the counts
        displayVoteCounts(peaceVotes, warVotes);
    }

    // --- Event Listeners ---
    peaceBtn.addEventListener('click', () => handleVote('peace'));
    warBtn.addEventListener('click', () => handleVote('war'));

    // --- Initialize ---
    startTimer(); // Start the application
});
