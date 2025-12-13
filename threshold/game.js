// Game State Management
const gameState = {
    resilienceScore: 0,
    stressLevel: 0,
    inventory: {
        supports: [],
        strategies: [],
        sagacity: []
    },
    coreValues: [],
    mindset: "Fixed",
    currentPhase: "character-creation",
    scenariosCompleted: 0,
    choices: []
};

// Available Values for Character Creation
const availableValues = [
    { id: "family", name: "Family", description: "Prioritizing relationships with loved ones" },
    { id: "honesty", name: "Honesty", description: "Being truthful and authentic" },
    { id: "ambition", name: "Ambition", description: "Striving for personal achievement" },
    { id: "integrity", name: "Integrity", description: "Acting with moral principles" },
    { id: "growth", name: "Growth", description: "Continuous learning and development" },
    { id: "compassion", name: "Compassion", description: "Empathy and care for others" },
    { id: "independence", name: "Independence", description: "Self-reliance and autonomy" },
    { id: "creativity", name: "Creativity", description: "Expressing originality and innovation" }
];

// Game Scenarios
const scenarios = [
    {
        id: "setback",
        title: "The Setback",
        description: "You receive a rejection letter—whether it's from a university, a job application, or a dream opportunity. The disappointment is real.",
        choices: [
            {
                text: "Blame the system. It's unfair and rigged against people like you.",
                effects: { stressLevel: 15, resilienceScore: -5 },
                mindset: "Fixed",
                circle: "concern",
                description: "You focus on what you can't control, which drains your energy."
            },
            {
                text: "Read a 'CV of Failures' to gain perspective. Many successful people faced rejections too.",
                effects: { stressLevel: -5, resilienceScore: 10, sagacity: "Failure is part of the journey" },
                mindset: "Growth",
                circle: "influence",
                description: "You reframe the setback as a learning opportunity."
            },
            {
                text: "Reach out to a mentor or family member to discuss your feelings.",
                effects: { stressLevel: -10, resilienceScore: 8, supports: "Reached out for support" },
                mindset: "Growth",
                circle: "influence",
                description: "You seek connection and support, building your resilience."
            }
        ]
    },
    {
        id: "conflict",
        title: "The Conflict",
        description: "A close friend or family member is struggling—perhaps going through a breakup, dealing with anxiety, or facing a major life challenge. They come to you for help.",
        choices: [
            {
                text: "Offer empty platitudes: 'You'll find someone else' or 'Everything happens for a reason.'",
                effects: { stressLevel: 5, resilienceScore: -3 },
                mindset: "Fixed",
                circle: "concern",
                description: "You avoid genuine connection, which increases your own stress."
            },
            {
                text: "Encourage self-reliance and help them reframe pain as fuel for growth.",
                effects: { stressLevel: -5, resilienceScore: 12, strategies: "Helping others reframe challenges" },
                mindset: "Growth",
                circle: "influence",
                description: "You practice empathy while encouraging resilience in others."
            },
            {
                text: "Listen actively and validate their feelings, then suggest practical steps they can take.",
                effects: { stressLevel: -8, resilienceScore: 10, supports: "Deepened relationship through empathy" },
                mindset: "Growth",
                circle: "influence",
                description: "You create genuine connection and offer actionable support."
            }
        ]
    },
    {
        id: "dilemma",
        title: "The Dilemma",
        description: "You're in a group project where other members aren't contributing their fair share. The deadline is approaching, and the quality of the work is suffering.",
        choices: [
            {
                text: "Do it all yourself to ensure it's 'perfect.' You can't trust others to do it right.",
                effects: { stressLevel: 20, resilienceScore: -8 },
                mindset: "Fixed",
                circle: "concern",
                driver: "Be Perfect",
                description: "Your 'Be Perfect' driver takes over, leading to burnout."
            },
            {
                text: "Have a value-based conversation with the group about shared responsibility.",
                effects: { stressLevel: -10, resilienceScore: 15 },
                mindset: "Growth",
                circle: "influence",
                allower: "It is okay to make mistakes",
                description: "You communicate your values and set healthy boundaries."
            },
            {
                text: "Document the contributions and speak with the instructor about the situation.",
                effects: { stressLevel: -5, resilienceScore: 12, strategies: "Assertive communication" },
                mindset: "Growth",
                circle: "influence",
                description: "You take action within your control while maintaining integrity."
            }
        ]
    }
];

// DOM Elements
const startScreen = document.getElementById('start-screen');
const gameContainer = document.getElementById('game-container');
const gameContent = document.getElementById('game-content');
const startButton = document.getElementById('start-button');
const body = document.getElementById('body');

// Initialize Game
function init() {
    startButton.addEventListener('click', startCharacterCreation);
    updateUI();
}

// Start Character Creation
function startCharacterCreation() {
    startScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    gameState.currentPhase = "character-creation";
    renderCharacterCreation();
    updateUI();
}

// Render Character Creation Phase
function renderCharacterCreation() {
    const selectedCount = gameState.coreValues.length;
    const maxSelections = 3;
    
    let html = `
        <h2 class="text-3xl font-bold mb-4 text-gray-800">Phase 1: The Mirror</h2>
        <p class="text-lg text-gray-600 mb-6">
            Choose your core values. These will guide your decisions throughout your journey.
            Select up to ${maxSelections} values that resonate with you.
        </p>
        <p class="text-sm text-gray-500 mb-6">
            ${selectedCount} of ${maxSelections} selected
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
    `;
    
    availableValues.forEach(value => {
        const isSelected = gameState.coreValues.includes(value.id);
        const disabled = !isSelected && selectedCount >= maxSelections;
        html += `
            <button 
                class="value-card p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : disabled 
                            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed' 
                            : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                }"
                data-value-id="${value.id}"
                ${disabled ? 'disabled' : ''}
            >
                <div class="font-bold text-lg mb-1">${value.name}</div>
                <div class="text-sm text-gray-600">${value.description}</div>
            </button>
        `;
    });
    
    html += `</div>`;
    
    if (selectedCount > 0) {
        html += `
            <button 
                id="continue-button" 
                class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
            >
                Continue to Your Journey
            </button>
        `;
    }
    
    gameContent.innerHTML = html;
    
    // Add event listeners
    document.querySelectorAll('.value-card').forEach(card => {
        card.addEventListener('click', function() {
            const valueId = this.dataset.valueId;
            toggleValue(valueId);
        });
    });
    
    const continueButton = document.getElementById('continue-button');
    if (continueButton) {
        continueButton.addEventListener('click', startScenarios);
    }
}

// Toggle Value Selection
function toggleValue(valueId) {
    const index = gameState.coreValues.indexOf(valueId);
    if (index > -1) {
        gameState.coreValues.splice(index, 1);
    } else if (gameState.coreValues.length < 3) {
        gameState.coreValues.push(valueId);
    }
    renderCharacterCreation();
    updateUI();
}

// Start Scenarios Phase
function startScenarios() {
    gameState.currentPhase = "scenarios";
    gameState.scenariosCompleted = 0;
    renderNextScenario();
    updateUI();
}

// Render Next Scenario
function renderNextScenario() {
    if (gameState.scenariosCompleted >= scenarios.length) {
        renderEndgame();
        return;
    }
    
    const scenario = scenarios[gameState.scenariosCompleted];
    let html = `
        <h2 class="text-3xl font-bold mb-4 text-gray-800">${scenario.title}</h2>
        <p class="text-lg text-gray-600 mb-8 leading-relaxed">${scenario.description}</p>
        <div class="space-y-4">
    `;
    
    scenario.choices.forEach((choice, index) => {
        html += `
            <button 
                class="choice-button w-full p-4 text-left rounded-lg border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all"
                data-choice-index="${index}"
            >
                <div class="font-semibold mb-2">${choice.text}</div>
                <div class="text-sm text-gray-500">${choice.description}</div>
            </button>
        `;
    });
    
    html += `</div>`;
    
    gameContent.innerHTML = html;
    
    // Add event listeners
    document.querySelectorAll('.choice-button').forEach(button => {
        button.addEventListener('click', function() {
            const choiceIndex = parseInt(this.dataset.choiceIndex);
            makeChoice(choiceIndex);
        });
    });
    
    updateUI();
}

// Make Choice
function makeChoice(choiceIndex) {
    const scenario = scenarios[gameState.scenariosCompleted];
    const choice = scenario.choices[choiceIndex];
    
    // Apply effects
    if (choice.effects.stressLevel) {
        gameState.stressLevel = Math.max(0, Math.min(100, gameState.stressLevel + choice.effects.stressLevel));
    }
    if (choice.effects.resilienceScore) {
        gameState.resilienceScore = Math.max(0, Math.min(100, gameState.resilienceScore + choice.effects.resilienceScore));
    }
    if (choice.effects.supports) {
        gameState.inventory.supports.push(choice.effects.supports);
    }
    if (choice.effects.strategies) {
        gameState.inventory.strategies.push(choice.effects.strategies);
    }
    if (choice.effects.sagacity) {
        gameState.inventory.sagacity.push(choice.effects.sagacity);
    }
    
    // Update mindset
    if (choice.mindset === "Growth" && gameState.mindset === "Fixed") {
        // Gradually shift to growth mindset
        if (Math.random() > 0.5) {
            gameState.mindset = "Growth";
        }
    }
    
    // Track choice
    gameState.choices.push({
        scenario: scenario.id,
        choice: choiceIndex,
        effects: choice.effects
    });
    
    // Show feedback
    showChoiceFeedback(choice);
    
    // Add RNG for unexpected events
    if (Math.random() > 0.7) {
        setTimeout(() => {
            triggerUnexpectedEvent();
        }, 2000);
    } else {
        setTimeout(() => {
            gameState.scenariosCompleted++;
            renderNextScenario();
        }, 2000);
    }
    
    updateUI();
}

// Show Choice Feedback
function showChoiceFeedback(choice) {
    let feedback = `
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <p class="font-semibold text-blue-800 mb-2">Your Choice</p>
            <p class="text-blue-700">${choice.description}</p>
    `;
    
    if (choice.circle === "influence") {
        feedback += `<p class="text-sm text-blue-600 mt-2">✓ This action was within your Circle of Influence</p>`;
    } else {
        feedback += `<p class="text-sm text-red-600 mt-2">⚠ This action focused on your Circle of Concern</p>`;
    }
    
    if (choice.driver) {
        feedback += `<p class="text-sm text-orange-600 mt-2">⚠ Your "${choice.driver}" driver is active</p>`;
    }
    
    if (choice.allower) {
        feedback += `<p class="text-sm text-green-600 mt-2">✓ You unlocked: "${choice.allower}"</p>`;
    }
    
    feedback += `</div>`;
    
    gameContent.innerHTML = feedback + gameContent.innerHTML;
}

// Trigger Unexpected Event (RNG)
function triggerUnexpectedEvent() {
    const events = [
        {
            text: "You receive an unexpected call from a friend you haven't spoken to in a while. They're checking in on you.",
            effects: { stressLevel: -5, resilienceScore: 5, supports: "Unexpected connection" }
        },
        {
            text: "You stumble upon an inspiring quote that resonates with your current situation.",
            effects: { resilienceScore: 5, sagacity: "Inspiration found in unexpected places" }
        },
        {
            text: "A small setback occurs—maybe you miss a bus or forget something important. How do you respond?",
            effects: { stressLevel: 5 }
        }
    ];
    
    const event = events[Math.floor(Math.random() * events.length)];
    
    let html = `
        <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
            <p class="font-semibold text-yellow-800 mb-2">Unexpected Event</p>
            <p class="text-yellow-700">${event.text}</p>
        </div>
    `;
    
    gameContent.innerHTML = html + gameContent.innerHTML;
    
    // Apply effects
    if (event.effects.stressLevel) {
        gameState.stressLevel = Math.max(0, Math.min(100, gameState.stressLevel + event.effects.stressLevel));
    }
    if (event.effects.resilienceScore) {
        gameState.resilienceScore = Math.max(0, Math.min(100, gameState.resilienceScore + event.effects.resilienceScore));
    }
    if (event.effects.supports) {
        gameState.inventory.supports.push(event.effects.supports);
    }
    if (event.effects.sagacity) {
        gameState.inventory.sagacity.push(event.effects.sagacity);
    }
    
    setTimeout(() => {
        gameState.scenariosCompleted++;
        renderNextScenario();
    }, 3000);
    
    updateUI();
}

// Render Endgame
function renderEndgame() {
    gameState.currentPhase = "endgame";
    
    const zone = getZone();
    const resiliencePlan = generateResiliencePlan();
    
    let html = `
        <h2 class="text-3xl font-bold mb-4 text-gray-800">Phase 3: The Reflection</h2>
        <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
            <h3 class="text-2xl font-bold mb-4 text-gray-800">Your Journey Summary</h3>
            <div class="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <div class="text-sm text-gray-600">Final Resilience Score</div>
                    <div class="text-4xl font-bold text-blue-600">${gameState.resilienceScore}</div>
                </div>
                <div>
                    <div class="text-sm text-gray-600">Final Stress Level</div>
                    <div class="text-4xl font-bold" id="final-stress">${gameState.stressLevel}</div>
                </div>
            </div>
            <div class="mb-4">
                <div class="text-sm text-gray-600 mb-2">Your Mindset</div>
                <div class="text-xl font-semibold">${gameState.mindset === "Growth" ? "Growth Mindset ✓" : "Fixed Mindset"}</div>
            </div>
            <div class="mb-4">
                <div class="text-sm text-gray-600 mb-2">Your Current Zone</div>
                <div class="text-xl font-semibold">${zone}</div>
            </div>
        </div>
        
        <div class="bg-white border-2 border-gray-200 rounded-lg p-6 mb-6">
            <h3 class="text-2xl font-bold mb-4 text-gray-800">Your Resilience Plan</h3>
            <div class="prose max-w-none">
                ${resiliencePlan}
            </div>
        </div>
        
        <div class="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
            <h3 class="text-xl font-bold mb-4 text-gray-800">Note to Self</h3>
            <p class="text-gray-600 mb-4">Write a short reflection on what you learned from this journey:</p>
            <textarea 
                id="reflection-text" 
                class="w-full p-4 border-2 border-gray-300 rounded-lg mb-4" 
                rows="4"
                placeholder="What did you learn about yourself? What will you remember moving forward?"
            ></textarea>
            <button 
                id="save-reflection" 
                class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg"
            >
                Save Reflection
            </button>
        </div>
        
        <div class="text-center">
            <button 
                id="restart-button" 
                class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
            >
                Start New Journey
            </button>
        </div>
    `;
    
    gameContent.innerHTML = html;
    
    // Add event listeners
    document.getElementById('save-reflection')?.addEventListener('click', function() {
        const reflection = document.getElementById('reflection-text').value;
        if (reflection.trim()) {
            alert('Reflection saved! This is your personal note to carry forward.');
        }
    });
    
    document.getElementById('restart-button')?.addEventListener('click', function() {
        resetGame();
        startCharacterCreation();
    });
    
    updateUI();
}

// Generate Resilience Plan
function generateResiliencePlan() {
    let plan = '<ul class="list-disc pl-6 space-y-2">';
    
    // Based on resilience score
    if (gameState.resilienceScore >= 70) {
        plan += '<li class="text-gray-700">You\'ve built strong resilience. Continue practicing the strategies that work for you.</li>';
    } else if (gameState.resilienceScore >= 40) {
        plan += '<li class="text-gray-700">You\'re making progress. Focus on building more supports and strategies.</li>';
    } else {
        plan += '<li class="text-gray-700">Consider seeking additional support and practicing more coping strategies.</li>';
    }
    
    // Based on stress level
    if (gameState.stressLevel > 70) {
        plan += '<li class="text-gray-700">Your stress is high. Prioritize self-care and focus on your Circle of Influence.</li>';
    } else if (gameState.stressLevel > 40) {
        plan += '<li class="text-gray-700">Monitor your stress levels and use your strategies when needed.</li>';
    } else {
        plan += '<li class="text-gray-700">You\'re managing stress well. Keep up the good work!</li>';
    }
    
    // Based on mindset
    if (gameState.mindset === "Growth") {
        plan += '<li class="text-gray-700">You\'ve developed a growth mindset. This will serve you well in facing challenges.</li>';
    } else {
        plan += '<li class="text-gray-700">Practice reframing setbacks as learning opportunities to develop a growth mindset.</li>';
    }
    
    // Based on inventory
    if (gameState.inventory.supports.length > 0) {
        plan += '<li class="text-gray-700">You\'ve built connections: ' + gameState.inventory.supports.join(', ') + '</li>';
    }
    
    if (gameState.inventory.strategies.length > 0) {
        plan += '<li class="text-gray-700">Your strategies include: ' + gameState.inventory.strategies.join(', ') + '</li>';
    }
    
    if (gameState.inventory.sagacity.length > 0) {
        plan += '<li class="text-gray-700">Wisdom you\'ve collected: ' + gameState.inventory.sagacity.join(', ') + '</li>';
    }
    
    // Based on values
    if (gameState.coreValues.length > 0) {
        const valueNames = gameState.coreValues.map(id => {
            const value = availableValues.find(v => v.id === id);
            return value ? value.name : id;
        });
        plan += '<li class="text-gray-700">Your core values guide you: ' + valueNames.join(', ') + '</li>';
    }
    
    plan += '</ul>';
    
    return plan;
}

// Get Current Zone
function getZone() {
    if (gameState.stressLevel < 30) {
        return "Comfort Zone";
    } else if (gameState.stressLevel < 70) {
        return "Stretch Zone";
    } else {
        return "Panic Zone";
    }
}

// Update UI
function updateUI() {
    // Update stats
    document.getElementById('resilience-score').textContent = gameState.resilienceScore;
    document.getElementById('stress-level').textContent = gameState.stressLevel;
    document.getElementById('stress-level').className = `text-2xl font-bold ${
        gameState.stressLevel > 70 ? 'text-red-600' : 
        gameState.stressLevel > 40 ? 'text-orange-600' : 
        'text-green-600'
    }`;
    document.getElementById('mindset').textContent = gameState.mindset;
    document.getElementById('zone').textContent = getZone();
    
    // Update phase indicator
    const phaseNames = {
        "character-creation": "Phase 1: The Mirror",
        "scenarios": `Phase 2: The Crossroad (Scenario ${gameState.scenariosCompleted + 1}/${scenarios.length})`,
        "endgame": "Phase 3: The Reflection"
    };
    document.getElementById('phase-indicator').textContent = phaseNames[gameState.currentPhase] || "";
    
    // Update inventory
    updateInventory();
    
    // Update background color based on stress
    updateBackgroundColor();
}

// Update Inventory Display
function updateInventory() {
    const supportsEl = document.getElementById('inventory-supports');
    const strategiesEl = document.getElementById('inventory-strategies');
    const sagacityEl = document.getElementById('inventory-sagacity');
    const valuesEl = document.getElementById('inventory-values');
    
    if (gameState.inventory.supports.length > 0) {
        supportsEl.innerHTML = gameState.inventory.supports.map(s => `<li>${s}</li>`).join('');
    } else {
        supportsEl.innerHTML = '<li class="text-gray-400 italic">None yet</li>';
    }
    
    if (gameState.inventory.strategies.length > 0) {
        strategiesEl.innerHTML = gameState.inventory.strategies.map(s => `<li>${s}</li>`).join('');
    } else {
        strategiesEl.innerHTML = '<li class="text-gray-400 italic">None yet</li>';
    }
    
    if (gameState.inventory.sagacity.length > 0) {
        sagacityEl.innerHTML = gameState.inventory.sagacity.map(s => `<li>${s}</li>`).join('');
    } else {
        sagacityEl.innerHTML = '<li class="text-gray-400 italic">None yet</li>';
    }
    
    if (gameState.coreValues.length > 0) {
        const valueNames = gameState.coreValues.map(id => {
            const value = availableValues.find(v => v.id === id);
            return value ? value.name : id;
        });
        valuesEl.innerHTML = valueNames.map(v => `<li>${v}</li>`).join('');
    } else {
        valuesEl.innerHTML = '<li class="text-gray-400 italic">Not selected</li>';
    }
}

// Update Background Color Based on Stress
function updateBackgroundColor() {
    const zone = getZone();
    if (zone === "Panic Zone") {
        body.className = "min-h-screen transition-colors duration-500 bg-red-50";
    } else if (zone === "Stretch Zone") {
        body.className = "min-h-screen transition-colors duration-500 bg-yellow-50";
    } else {
        body.className = "min-h-screen transition-colors duration-500 bg-gray-50";
    }
}

// Reset Game
function resetGame() {
    gameState.resilienceScore = 0;
    gameState.stressLevel = 0;
    gameState.inventory = {
        supports: [],
        strategies: [],
        sagacity: []
    };
    gameState.coreValues = [];
    gameState.mindset = "Fixed";
    gameState.currentPhase = "character-creation";
    gameState.scenariosCompleted = 0;
    gameState.choices = [];
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
