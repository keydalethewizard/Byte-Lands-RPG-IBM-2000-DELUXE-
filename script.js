// --- DATOS GLOBALES DEL JUEGO ---
let player = null;
let currentEnemy = null;
let gameState = 'START'; // START, TOWN, EXPLORING, COMBAT, INPUT_WAIT

const ENEMIES = {
    'BUG_MENOR': { name: "Bug Menor", hp: 30, atk: 8, def: 2, exp: 25, bits: 10 },
    'VIRUS_CORRUPTOR': { name: "Virus Corruptor", hp: 50, atk: 15, def: 5, exp: 50, bits: 20 },
    'TROYANO_ROBUSTO': { name: "Troyano Robusto", hp: 75, atk: 12, def: 10, exp: 75, bits: 30 },
};

const ITEMS = {
    'KIT_REPARACION': { name: "Kit de Reparación", type: 'consumible', effect: { type: 'hp', value: 30 }, price: 20, value: 5 },
    'BATERIA_PODER': { name: "Batería de Poder", type: 'consumible', effect: { type: 'pp', value: 20 }, price: 15, value: 5 },
    'CABLE_ETHERNET': { name: "Cable Ethernet", type: 'arma', value: 5, price: 40, atk_bonus: 5 },
    'TECLADO_LASER': { name: "Teclado Láser", type: 'arma', value: 8, price: 60, atk_bonus: 8 },
    'CHALECO_FIRMWARE': { name: "Chaleco de Firmware", type: 'armadura', value: 3, price: 60, def_bonus: 3 },
    'CASCO_CPU': { name: "Casco de CPU", type: 'armadura', value: 2, price: 50, def_bonus: 2 },
};

const CLASSES = {
    'PROGRAMADOR': { stats: { BYTE: 4, FLOP: 5, CLOCK: 8, RAM: 6, MHz: 7 }, abilities: ['REPARAR_CODIGO'], equip: ['CABLE_ETHERNET'] },
    'HACKER': { stats: { BYTE: 5, FLOP: 9, CLOCK: 6, RAM: 5, MHz: 8 }, abilities: ['EXPLOIT_V1'], equip: ['TECLADO_LASER'] },
    'INGENIERO': { stats: { BYTE: 8, FLOP: 4, CLOCK: 5, RAM: 8, MHz: 5 }, abilities: ['SOBRECARGA_HW'], equip: ['CHALECO_FIRMWARE'] },
};

const MAP = {
    "DIRECTORIO_RAIZ": {
        desc: "El Directorio Raíz. Un lugar seguro y familiar. Ves una Tienda de Bits y el camino a la Cuadrícula de Circuitos (Este).",
        conn: { "ESTE": "CUADRICULA_CIRCUITOS" },
        events: ['TOWN_SAFE'],
        options: { "T": "Tienda de Bits", "C": "Reparar Código (Curar)" }
    },
    "CUADRICULA_CIRCUITOS": {
        desc: "Laberintos de cables y componentes. El aire huele a ozono y a peligro.",
        conn: { "OESTE": "DIRECTORIO_RAIZ", "NORTE": "MONTAÑAS_SILICIO" },
        events: ['COMBAT', 'ITEM_RANDOM', 'NOTHING'],
        options: { "E": "Explorar el Sector" }
    },
    "MONTAÑAS_SILICIO": {
        desc: "Las Montañas de Silicio, frías y elevadas. La señal es débil aquí.",
        conn: { "SUR": "CUADRICULA_CIRCUITOS" },
        events: ['COMBAT', 'COMBAT', 'ITEM_RARE'],
        options: { "E": "Explorar el Sector" }
    }
};

// --- ESTRUCTURA DEL JUGADOR ---

class Player {
    constructor(name, chosenClass) {
        this.name = name;
        this.class = chosenClass;
        this.inventory = [ITEMS.KIT_REPARACION, ITEMS.BATERIA_PODER]; // Items iniciales
        this.equipment = { 'arma': null, 'armadura': null };
        this.bits = 100;
        
        // Carga de stats base
        Object.assign(this, CLASSES[chosenClass].stats);

        this.hp_max = 50 + this.RAM * 5;
        this.pp_max = 30 + this.CLOCK * 3;
        this.hp_current = this.hp_max;
        this.pp_current = this.pp_max;
        this.level = 1;
        this.exp = 0;
        this.exp_to_level = 100;
        this.location = "DIRECTORIO_RAIZ";
        this.abilities = CLASSES[chosenClass].abilities;
    }

    getAttack() {
        let atk = this.BYTE * 1.5;
        if (this.equipment.arma) atk += this.equipment.arma.atk_bonus;
        return Math.floor(atk);
    }

    getDefense() {
        let def = this.RAM * 0.5;
        if (this.equipment.armadura) def += this.equipment.armadura.def_bonus;
        return Math.floor(def);
    }

    takeDamage(damage) {
        let finalDamage = Math.max(0, damage - this.getDefense());
        this.hp_current -= finalDamage;
        return finalDamage;
    }
}

// --- MANEJO DEL DOM Y RENDERIZADO ---

const display = document.getElementById('game-display');
const optionsContainer = document.getElementById('options-container');
const statusLine = document.getElementById('status-line');
const inputContainer = document.getElementById('input-container');
const userInput = document.getElementById('user-input');
const submitBtn = document.getElementById('submit-btn');

function print(text) {
    // Añade el texto al display y hace scroll al final
    display.innerHTML += `\n${text}`;
    display.scrollTop = display.scrollHeight;
}

function updateStatus() {
    if (!player) return;
    statusLine.textContent = `| HP: ${player.hp_current}/${player.hp_max} | PP: ${player.pp_current}/${player.pp_max} | NVL: ${player.level} | BITS: ${player.bits} | UBIC: ${player.location.replace('_', ' ')} |`;
}

function renderOptions(optionsMap) {
    const optionsContainer = document.getElementById('options-container'); // <-- Debe encontrar este ID
    optionsContainer.innerHTML = '';
    
    // ... (el código interno de creación de botones) ...

    // Opciones del sistema siempre presentes
    optionsContainer.innerHTML += `<button class="option-btn" onclick="handleSystemAction('I')">(I) Inventario</button>`;
    optionsContainer.innerHTML += `<button class="option-btn" onclick="handleSystemAction('S')">(S) Stats</button>`;
}
    // Opciones del sistema siempre presentes (aunque no se muestren como botón)
    optionsContainer.innerHTML += `<button class="option-btn" onclick="handleSystemAction('I')">(I) Inventario</button>`;
    optionsContainer.innerHTML += `<button class="option-btn" onclick="handleSystemAction('S')">(S) Stats</button>`;
}

function hideInput() {
    inputContainer.style.display = 'none';
}

function showInput(callback) {
    inputContainer.style.display = 'flex';
    userInput.value = '';
    userInput.focus();
    
    // Función para manejar el envío
    const handleSubmission = () => {
        const value = userInput.value.trim();
        if (value) {
            callback(value);
            userInput.value = '';
        }
    };

    // Usar el botón
    submitBtn.onclick = handleSubmission;
    
    // Usar la tecla Enter
    userInput.onkeyup = (event) => {
        if (event.key === 'Enter') {
            handleSubmission();
        }
    };
}

// --- LÓGICA DE FLUJO DEL JUEGO ---

function startGame() {
    gameState = 'START';
    print("==========================================================");
    print("      BYTE-LANDS-RPG-IBM-2000-DELUXE- V1.0 - POR KEYDALETHEWIZARD");
    print("==========================================================");
    print("\nBienvenido. El Núcleo Central está fallando.");
    print("Tienes que elegir un arquetipo para comenzar.");

    const options = {
        '1': { label: "Programador (Inteligencia)", action: () => chooseClass('PROGRAMADOR') },
        '2': { label: "Hacker (Destreza)", action: () => chooseClass('HACKER') },
        '3': { label: "Ingeniero (Fuerza/RAM)", action: () => chooseClass('INGENIERO') }
    };
    renderOptions(options);
    hideInput();
} // <-- CIERRE DE startGame

function chooseClass(className) {
    gameState = 'INPUT_WAIT';
    print(`\nHas elegido ser un ${className.replace('_', ' ')}.`);
    print("Ingresa el nombre de tu Viajero del Código:");
    
    renderOptions({});
    showInput((name) => {
        player = new Player(name.toUpperCase(), className);
        
        // Equipar arma inicial
        const initialWeaponName = CLASSES[className].equip[0];
        const initialWeapon = ITEMS[initialWeaponName];
        player.inventory.push(initialWeapon);
        player.equipment[initialWeapon.type] = initialWeapon;

        print(`\n¡Bienvenido, ${player.name}!`);
        hideInput();
        updateStatus();
        exploreLocation();
    });
} // <-- CIERRE DE chooseClass

function chooseClass(className) {
    gameState = 'INPUT_WAIT';
    print(`\nHas elegido ser un ${className.replace('_', ' ')}.`);
    print("Ingresa el nombre de tu Viajero del Código:");
    
    renderOptions({});
    showInput((name) => {
        player = new Player(name.toUpperCase(), className);
        
        // Equipar arma inicial
        const initialWeaponName = CLASSES[className].equip[0];
        const initialWeapon = ITEMS[initialWeaponName];
        player.inventory.push(initialWeapon);
        player.equipment[initialWeapon.type] = initialWeapon;

        // Añadir consumibles iniciales (ya están en el constructor, pero esta línea es de la versión robusta)
        // player.inventory.push(ITEMS.KIT_REPARACION, ITEMS.BATERIA_PODER); 
        // Si no tienes esta línea, déjala fuera, pero el resto de la estructura es vital:
        
        print(`\n¡Bienvenido, ${player.name}!`);
        hideInput();
        updateStatus();
        exploreLocation();
    });
}
    
    renderOptions({});
    showInput((name) => {
        player = new Player(name.toUpperCase(), className);
        
        // Equipar arma inicial
        const initialWeaponName = CLASSES[className].equip[0];
        const initialWeapon = ITEMS[initialWeaponName];
        player.inventory.push(initialWeapon);
        player.equipment[initialWeapon.type] = initialWeapon;

        print(`\n¡Bienvenido, ${player.name}!`);
        hideInput();
        updateStatus();
        exploreLocation();
    });
}

// --- LÓGICA DE EXPLORACIÓN ---

function exploreLocation() {
    gameState = 'EXPLORING';
    const loc = MAP[player.location];
    print("\n" + "~".repeat(40));
    print(`UBICACIÓN: ${player.location.replace('_', ' ')}`);
    print(loc.desc);
    print("~".repeat(40));

    const options = getExploreOptions();
    renderOptions(options);
}

function move(newLocation) {
    print(`\nMOV: Te diriges a ${newLocation.replace('_', ' ')}...`);
    player.location = newLocation;
    
    if (newLocation !== 'DIRECTORIO_RAIZ') {
        // Ejecutar evento aleatorio en zonas peligrosas
        handleRandomEvent();
    } else {
        exploreLocation();
    }
}

function handleRandomEvent() {
    const loc = MAP[player.location];
    const events = loc.events;
    const event = events[Math.floor(Math.random() * events.length)];

    if (event === 'COMBAT') {
        const enemyKey = randomEnemyKey();
        currentEnemy = JSON.parse(JSON.stringify(ENEMIES[enemyKey])); // Clonar al enemigo
        print(`\n[EVENTO: COMBATE] ¡Aparece un ${currentEnemy.name}!`);
        startCombat();
    } else if (event === 'ITEM_RANDOM' || event === 'ITEM_RARE') {
        const itemKey = event === 'ITEM_RARE' ? 'TECLADO_LASER' : 'KIT_REPARACION';
        const item = ITEMS[itemKey];
        player.inventory.push(item);
        print(`\n[EVENTO: ENCONTRADO] ¡Descubriste un ${item.name}!`);
        exploreLocation();
    } else if (event === 'NOTHING') {
        print("\n[EVENTO: NADA] El sector está en silencio. Sigues tu camino.");
        exploreLocation();
    } else if (event === 'TOWN_SAFE') {
        exploreLocation();
    }
}

function handleLocationAction(actionKey) {
    if (actionKey === 'T') {
        showShop();
    } else if (actionKey === 'C') {
        player.hp_current = player.hp_max;
        player.pp_current = player.pp_max;
        print("\n[REPARACIÓN COMPLETA] Código optimizado. HP y PP restaurados.");
        updateStatus();
        exploreLocation();
    } else if (actionKey === 'E') {
        handleRandomEvent();
    }
}

// --- SISTEMA DE COMBATE ---

function randomEnemyKey() {
    const keys = Object.keys(ENEMIES);
    // Peso para Bugs: 5, Virus: 3, Troyano: 2 (simple)
    const weights = [5, 3, 2];
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < keys.length; i++) {
        random -= weights[i];
        if (random <= 0) return keys[i];
    }
    return keys[0]; // Fallback
}

function startCombat() {
    gameState = 'COMBAT';
    print("\n" + "=".repeat(40));
    print(`COMBATE | ${currentEnemy.name} HP: ${currentEnemy.hp} `);
    print("=".repeat(40));
    
    // Opciones de combate
    const options = getCombatOptions();
    renderOptions(options);
    updateStatus();
}

function playerAttack() {
    let damage = player.getAttack();
    let finalDamage = Math.max(0, damage - currentEnemy.def);
    currentEnemy.hp -= finalDamage;

    print(`\n> ATACAS. Infliges ${finalDamage} de daño a ${currentEnemy.name}.`);

    if (currentEnemy.hp <= 0) {
        winCombat();
    } else {
        enemyTurn();
    }
}

function winCombat() {
    print(`\n!!! ${currentEnemy.name} ha sido DESTRUIDO. !!!`);
    player.bits += currentEnemy.bits;
    player.exp += currentEnemy.exp;
    print(`+${currentEnemy.exp} EXP. +${currentEnemy.bits} Bits.`);
    
    checkLevelUp();
    currentEnemy = null;
    exploreLocation();
}

function enemyTurn() {
    let damage = currentEnemy.atk;
    let finalDamage = player.takeDamage(damage);

    print(`\n< ${currentEnemy.name} ATACA. Recibes ${finalDamage} de daño.`);
    updateStatus();

    if (player.hp_current <= 0) {
        gameOver();
    } else {
        startCombat(); // Vuelve a mostrar las opciones de combate
    }
}

function combatAbilities() {
    const abilitiesMap = {};
    player.abilities.forEach((abi, index) => {
        abilitiesMap[index + 1] = { 
            label: `${abi.replace('_', ' ')} (10 PP)`, // Costo fijo para simplificar
            action: () => useAbility(abi) 
        };
    });
    
    abilitiesMap['0'] = { label: "Cancelar", action: startCombat };
    renderOptions(abilitiesMap);
    print("\nElige una habilidad:");
}

function useAbility(abi) {
    let pp_cost = 10;
    let success = false;
    let damage = 0;
    
    if (player.pp_current < pp_cost) {
        print("PP insuficiente.");
        return startCombat();
    }

    player.pp_current -= pp_cost;

    if (abi === 'REPARAR_CODIGO') {
        let heal = player.CLOCK * 5;
        player.hp_current = Math.min(player.hp_max, player.hp_current + heal);
        print(`¡REPARACIÓN COMPLETA! Curado ${heal} HP.`);
        success = true;
    } else if (abi === 'EXPLOIT_V1') {
        damage = player.getAttack() * 2;
        print(`¡EXPLOIT! Infliges ${damage} de daño extra.`);
        currentEnemy.hp -= damage;
        success = true;
    } else { // SOBRECARGA_HW
        damage = player.getAttack() * 1.5;
        player.hp_current = Math.max(0, player.hp_current - 5); // Daño de retroceso
        print(`¡SOBRECARGA! Infliges ${damage} de daño. Pierdes 5 HP.`);
        currentEnemy.hp -= damage;
        success = true;
    }

    updateStatus();

    if (currentEnemy.hp <= 0) {
        winCombat();
    } else if (success) {
        enemyTurn();
    } else {
        startCombat();
    }
}

function attemptEscape() {
    let successChance = player.MHz * 5; // 5% por punto de MHz
    if (Math.random() * 100 < successChance) {
        print("\n> Lograste ESCAPAR!");
        currentEnemy = null;
        exploreLocation();
    } else {
        print("\n> Fallaste el intento de ESCAPE.");
        enemyTurn();
    }
}

// --- LÓGICA DE INVENTARIO Y TIENDA ---

function handleSystemAction(action) {
    // 🛑 AGREGAR ESTA LÍNEA DE VERIFICACIÓN:
    if (!player) {
        print("\n[SISTEMA] Debes crear tu Viajero del Código antes de acceder al menú.");
        return;
    }
    // -------------------------------------
    
    if (action === 'S') {
        showStats();
    } else if (action === 'I') {
        showInventory(gameState === 'COMBAT');
    }
}
function showStats() {
    // ESTA LÍNEA EVITA EL ERROR 'Cannot read properties of null'
    if (!player) return; 

    let statsText = `\n--- ESTADÍSTICAS DE ${player.name} ---\n`;
    statsText += `CLASE: ${player.class} | NIVEL: ${player.level}\n`;
    statsText += `EXP: ${player.exp}/${player.exp_to_level}\n`;
    statsText += `BITS: ${player.bits}\n`;
    statsText += `ARMAS: ${player.equipment.arma ? player.equipment.arma.name : 'Ninguna'} (ATK: ${player.getAttack()})\n`;
    statsText += `ARMADURA: ${player.equipment.armadura ? player.equipment.armadura.name : 'Ninguna'} (DEF: ${player.getDefense()})\n`;
    statsText += `\nBYTE (Fuerza): ${player.BYTE} | FLOP (Destreza): ${player.FLOP} | CLOCK (Inteligencia): ${player.CLOCK}\n`;
    statsText += `RAM (Resistencia): ${player.RAM} | MHz (Velocidad): ${player.MHz}`;
    print(statsText);
    renderOptions(getExploreOptions());
}

function showInventory(inCombat) {
    // 🛑 AGREGAMOS ESTA LÍNEA DE SEGURIDAD AL PRINCIPIO
    if (!player) return; 
    // ----------------------------------------------------
    
    if (player.inventory.length === 0) {
        print("\n--- INVENTARIO: VACÍO ---");
        renderOptions(inCombat ? getCombatOptions() : getExploreOptions());
        return;
    }

    print("\n--- INVENTARIO ---");
    const itemMap = {};
    player.inventory.forEach((item, index) => {
        print(`(${index + 1}) ${item.name} (${item.type})`);
        itemMap[index + 1] = item;
    });

    print("\nIntroduce el número del ítem para USAR/EQUIPAR (0 para salir):");
    renderOptions({});
    
    showInput((input) => {
        let index = parseInt(input) - 1;
        if (index === -1) {
            hideInput();
            if (inCombat) startCombat(); else exploreLocation();
            return;
        }

        if (index >= 0 && index < player.inventory.length) {
            const item = player.inventory[index];
            if (item.type === 'consumible') {
                useConsumible(item, index);
                if (inCombat) enemyTurn();
            } else if (item.type === 'arma' || item.type === 'armadura') {
                equipItem(item, item.type, index);
            } else {
                print("No se puede usar/equipar este ítem de esa forma.");
            }
        }
        
        hideInput();
        if (!inCombat) exploreLocation();
        
    });
}
    print("\n--- INVENTARIO ---");
    const itemMap = {};
    player.inventory.forEach((item, index) => {
        print(`(${index + 1}) ${item.name} (${item.type})`);
        itemMap[index + 1] = item;
    });

    print("\nIntroduce el número del ítem para USAR/EQUIPAR (0 para salir):");
    renderOptions({});
    
    showInput((input) => {
        let index = parseInt(input) - 1;
        if (index === -1) {
            hideInput();
            if (inCombat) startCombat(); else exploreLocation();
            return;
        }

        if (index >= 0 && index < player.inventory.length) {
            const item = player.inventory[index];
            if (item.type === 'consumible') {
                useConsumible(item, index);
                if (inCombat) enemyTurn();
            } else if (item.type === 'arma' || item.type === 'armadura') {
                equipItem(item, item.type, index);
            } else {
                print("No se puede usar/equipar este ítem de esa forma.");
            }
        }
        
        hideInput();
        if (!inCombat) exploreLocation();
        
    });
}

function useConsumible(item, index) {
    player.inventory.splice(index, 1);
    if (item.effect.type === 'hp') {
        let heal = item.effect.value;
        player.hp_current = Math.min(player.hp_max, player.hp_current + heal);
        print(`Usaste ${item.name}. Curaste ${heal} HP.`);
    } else if (item.effect.type === 'pp') {
        let recover = item.effect.value;
        player.pp_current = Math.min(player.pp_max, player.pp_current + recover);
        print(`Usaste ${item.name}. Recuperaste ${recover} PP.`);
    }
    updateStatus();
}

function equipItem(item, type, index) {
    if (player.equipment[type] && player.equipment[type] === item) {
        print(`Ya tienes ${item.name} equipado.`);
        return;
    }
    
    if (player.equipment[type]) {
        player.inventory.push(player.equipment[type]);
    }
    
    player.equipment[type] = item;
    player.inventory.splice(index, 1);
    
    print(`¡Equipaste: ${item.name}! Tu ataque/defensa ha cambiado.`);
    updateStatus();
}

function showShop() {
    gameState = 'TOWN';
    print("\n--- TIENDA DE BITS ---");
    print(`Bits disponibles: ${player.bits}`);

    const shopItems = [ITEMS.KIT_REPARACION, ITEMS.BATERIA_PODER, ITEMS.CABLE_ETHERNET, ITEMS.CHALECO_FIRMWARE];
    const shopOptions = {};
    
    shopItems.forEach((item, index) => {
        shopOptions[index + 1] = { 
            label: `${item.name} (${item.price} Bits)`,
            action: () => buyItem(item)
        };
    });

    shopOptions['0'] = { label: "Salir", action: exploreLocation };
    renderOptions(shopOptions);
}

function buyItem(item) {
    if (player.bits >= item.price) {
        player.bits -= item.price;
        player.inventory.push(item);
        print(`Compraste ${item.name}. Bits restantes: ${player.bits}`);
        updateStatus();
        showShop();
    } else {
        print("¡Bits insuficientes!");
    }
}

// --- LÓGICA DE NIVEL ---

function checkLevelUp() {
    if (player.exp >= player.exp_to_level) {
        player.level++;
        player.exp -= player.exp_to_level;
        player.exp_to_level = Math.floor(player.exp_to_level * 1.5);
        
        player.hp_max += 10;
        player.pp_max += 5;
        player.hp_current = player.hp_max;
        player.pp_current = player.pp_max;
        
        const stats = ['BYTE', 'FLOP', 'CLOCK', 'RAM', 'MHz'];
        const statToImprove = stats[Math.floor(Math.random() * stats.length)];
        player[statToImprove]++;
        
        print(`\n*** ¡SUBIDA DE NIVEL! Ahora eres Nivel ${player.level}. ***`);
        print(`Tu atributo ${statToImprove} ha mejorado en 1.`);
        updateStatus();
    }
}

// --- FUNCIONES FINALES ---

function gameOver() {
    gameState = 'START';
    print("\n" + "=".repeat(40));
    print("¡ERROR CRÍTICO! Tu código ha sido CORROMPIDO.");
    print("FIN DEL JUEGO.");
    print("=".repeat(40));
    
    const options = {
        '1': { label: "Volver al Menú Principal", action: startGame }
    };
    renderOptions(options);
}

// Funciones auxiliares para obtener opciones de estado
function getExploreOptions() {
    const loc = MAP[player.location];
    const options = {};
    let keyIndex = 1;

    for (const dir in loc.conn) {
        const dest = loc.conn[dir];
        options[keyIndex.toString()] = { 
            label: `Ir al ${dir} (${dest.replace('_', ' ')})`, 
            action: () => move(dest) 
        };
        keyIndex++;
    }

    if (loc.options) {
        for (const key in loc.options) {
            options[key] = {
                label: loc.options[key],
                action: () => handleLocationAction(key)
            };
        }
    }
    return options;
}

function getCombatOptions() {
    return {
        'A': { label: "Atacar", action: () => playerAttack() },
        'H': { label: "Habilidad", action: () => combatAbilities() },
        'E': { label: "Escapar", action: () => attemptEscape() }
    };
}


// ... (Todo el código del juego) ...

// Funciones auxiliares para obtener opciones de estado
// ... (se mantienen igual las funciones getExploreOptions y getCombatOptions) ...


// --- INICIO ---
// Asegúrate de que esta línea esté al final de tu archivo script.js
document.addEventListener('DOMContentLoaded', startGame);
