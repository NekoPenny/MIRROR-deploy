
import { MoodEntry, UserState } from '../types';

export interface AnimalDef {
    id: string;
    name: { en: string, zh: string, es: string };
    description: { en: string, zh: string, es: string };
    image: string; // Data URI for SVG
    unlockHint: { en: string, zh: string, es: string };
    checkUnlock: (history: MoodEntry[], user: UserState) => boolean;
    color: string; // Background accent color
}

// Helper to create SVG Data URI for sketches
// Uses a hand-drawn style (thick black strokes) on a soft colored background
const getSketchSvg = (content: string, bgColor: string) => {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#${bgColor}"/>
        <g stroke="#2D2D2D" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none">
            ${content}
        </g>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
};

// Cute Hand-Drawn "Kawaii" Paths
const PATHS = {
    cat: `
        <!-- Head -->
        <path d="M40 70 Q20 150 100 160 Q180 150 160 70 Q100 50 40 70" /> 
        <!-- Ears -->
        <path d="M40 80 L30 30 L80 50" /> 
        <path d="M160 80 L170 30 L120 50" /> 
        <!-- Eyes -->
        <path d="M70 110 L70 115" stroke-width="14" /> 
        <path d="M130 110 L130 115" stroke-width="14" /> 
        <!-- Mouth -->
        <path d="M90 130 Q100 140 110 130" /> 
        <!-- Whiskers -->
        <path d="M20 110 L50 115 M20 125 L50 125" /> 
        <path d="M180 110 L150 115 M180 125 L150 125" /> 
    `,
    dolphin: `
        <!-- Body -->
        <path d="M40 120 Q30 40 100 40 Q160 40 170 100 Q175 120 140 120 Q110 120 100 100" /> 
        <!-- Tail -->
        <path d="M35 120 Q20 150 50 140 M35 120 Q50 150 70 140" /> 
        <!-- Fin -->
        <path d="M100 40 Q90 10 70 30" /> 
        <!-- Flipper Line -->
        <path d="M110 90 L130 90 M110 110 Q120 115 130 110" /> 
        <!-- Eye -->
        <circle cx="140" cy="70" r="5" fill="#2D2D2D" stroke="none"/> 
        <!-- Smile -->
        <path d="M160 100 Q165 105 170 100" /> 
    `,
    owl: `
        <!-- Body -->
        <path d="M50 160 Q30 50 100 50 Q170 50 150 160 Q100 180 50 160" /> 
        <!-- Eyes -->
        <circle cx="70" cy="90" r="24" /> 
        <circle cx="130" cy="90" r="24" /> 
        <circle cx="70" cy="90" r="5" fill="#2D2D2D" stroke="none" /> 
        <circle cx="130" cy="90" r="5" fill="#2D2D2D" stroke="none" /> 
        <!-- Beak -->
        <path d="M95 110 L100 120 L105 110" /> 
        <!-- Wings -->
        <path d="M35 100 Q20 130 40 150" /> 
        <path d="M165 100 Q180 130 160 150" /> 
        <!-- Ears -->
        <path d="M45 55 L40 35 M155 55 L160 35" /> 
    `,
    lion: `
        <!-- Mane Cloud -->
        <path d="M70 40 Q100 10 130 40 Q170 40 180 80 Q190 120 160 150 Q130 180 100 170 Q60 180 40 150 Q10 120 20 80 Q30 40 70 40" />
        <!-- Face -->
        <circle cx="100" cy="100" r="45" fill="#FFF3E0" />
        <!-- Eyes -->
        <path d="M80 90 L80 100" stroke-width="10" /> 
        <path d="M120 90 L120 100" stroke-width="10" /> 
        <!-- Nose -->
        <ellipse cx="100" cy="115" rx="10" ry="8" fill="#2D2D2D" stroke="none" /> 
        <!-- Mouth -->
        <path d="M100 120 L100 135 M90 135 Q100 145 110 135" /> 
        <!-- Whiskers -->
        <path d="M40 100 L20 95 M40 110 L20 115" /> 
        <path d="M160 100 L180 95 M160 110 L180 115" />
    `,
    koala: `
        <!-- Ears -->
        <circle cx="35" cy="70" r="28" /> 
        <circle cx="165" cy="70" r="28" /> 
        <!-- Head -->
        <path d="M40 80 Q40 160 100 160 Q160 160 160 80 Q160 30 100 30 Q40 30 40 80" /> 
        <!-- Nose -->
        <ellipse cx="100" cy="100" rx="20" ry="26" fill="#2D2D2D" stroke="none" /> 
        <!-- Eyes -->
        <circle cx="70" cy="80" r="5" fill="#2D2D2D" stroke="none"/>
        <circle cx="130" cy="80" r="5" fill="#2D2D2D" stroke="none"/>
    `,
    fox: `
        <!-- Head -->
        <path d="M30 60 Q10 100 50 130 Q100 170 150 130 Q190 100 170 60 Q100 40 30 60" /> 
        <!-- Ears -->
        <path d="M40 70 L20 20 L80 50" /> 
        <path d="M160 70 L180 20 L120 50" /> 
        <!-- Eyes (Closed) -->
        <path d="M70 90 Q80 85 90 90" /> 
        <path d="M110 90 Q120 85 130 90" /> 
        <!-- Nose -->
        <circle cx="100" cy="140" r="8" fill="#2D2D2D" stroke="none" /> 
    `,
    butterfly: `
        <!-- Body -->
        <path d="M100 50 L100 150" stroke-width="12" /> 
        <!-- Wings -->
        <path d="M100 60 Q30 20 30 80 Q30 100 100 90" /> 
        <path d="M100 90 Q40 150 100 130" /> 
        <path d="M100 60 Q170 20 170 80 Q170 100 100 90" /> 
        <path d="M100 90 Q160 150 100 130" /> 
        <!-- Antennae -->
        <path d="M100 50 Q80 20 60 30" /> 
        <path d="M100 50 Q120 20 140 30" /> 
    `,
    wolf: `
       <!-- Head -->
       <path d="M50 150 Q20 80 50 60 Q70 40 100 60 Q130 40 150 60 Q180 80 150 150 Q100 180 50 150" /> 
       <!-- Ears -->
       <path d="M50 70 L40 20 L80 50" /> 
       <path d="M150 70 L160 20 L120 50" /> 
       <!-- Eyes -->
       <circle cx="75" cy="90" r="5" fill="#2D2D2D" stroke="none" /> 
       <circle cx="125" cy="90" r="5" fill="#2D2D2D" stroke="none" /> 
       <!-- Nose -->
       <path d="M90 120 L110 120 L100 130 Z" fill="#2D2D2D" stroke="none"/> 
       <!-- Mouth -->
       <path d="M100 130 L100 140 M90 140 Q100 150 110 140" /> 
       <!-- Fluff -->
       <path d="M30 110 L50 120 M170 110 L150 120" /> 
    `
};

export const ANIMALS: AnimalDef[] = [
    {
        id: 'cat',
        name: { en: 'The Observer', zh: '观察者·猫', es: 'El Observador' },
        description: { 
            en: 'Quiet, independent, and deeply observant. You value your own space.',
            zh: '安静、独立且观察敏锐。你珍视属于自己的空间。',
            es: 'Tranquilo, independiente y profundamente observador.'
        },
        image: getSketchSvg(PATHS.cat, 'F3E5F5'), // Light Purple bg
        unlockHint: { en: 'Always with you.', zh: '始终相伴。', es: 'Siempre contigo.' },
        checkUnlock: () => true, // Default unlocked
        color: 'bg-purple-100'
    },
    {
        id: 'dolphin',
        name: { en: 'The Joyful', zh: '喜悦者·海豚', es: 'El Alegre' },
        description: {
            en: 'Playful and connected. You find happiness in shared moments.',
            zh: '顽皮且充满联结感。你在分享的时刻中找到快乐。',
            es: 'Juguetón y conectado.'
        },
        image: getSketchSvg(PATHS.dolphin, 'E1F5FE'), // Light Blue bg
        unlockHint: { en: 'Log 2 Pleasant moods.', zh: '记录 2 次“愉悦”心情。', es: 'Registra 2 estados de ánimo agradables.' },
        checkUnlock: (history) => history.filter(h => h.moodType === 'Pleasant').length >= 2,
        color: 'bg-blue-100'
    },
    {
        id: 'owl',
        name: { en: 'The Wise', zh: '智者·猫头鹰', es: 'El Sabio' },
        description: {
            en: 'You find clarity in solitude and late hours.',
            zh: '你在独处和深夜中找到清晰的思绪。',
            es: 'Encuentras claridad en la soledad.'
        },
        image: getSketchSvg(PATHS.owl, 'E8EAF6'), // Indigo bg
        unlockHint: { en: 'Log an entry late at night.', zh: '在深夜记录一次心情。', es: 'Registra una entrada tarde en la noche.' },
        checkUnlock: (history) => history.some(h => {
            const hour = new Date(h.timestamp).getHours();
            return hour >= 22 || hour <= 4;
        }),
        color: 'bg-indigo-100'
    },
    {
        id: 'lion',
        name: { en: 'The Brave', zh: '勇者·狮子', es: 'El Valiente' },
        description: {
            en: 'Full of energy and courage. You embrace intensity.',
            zh: '充满能量与勇气。你拥抱强烈的情感。',
            es: 'Lleno de energía y coraje.'
        },
        image: getSketchSvg(PATHS.lion, 'FFF3E0'), // Orange bg
        unlockHint: { en: 'Log a Thrilled mood.', zh: '记录一次“激动”心情。', es: 'Registra un estado de ánimo emocionado.' },
        checkUnlock: (history) => history.some(h => h.moodType === 'Thrilled'),
        color: 'bg-orange-100'
    },
    {
        id: 'koala',
        name: { en: 'The Peaceful', zh: '平和者·考拉', es: 'El Pacífico' },
        description: {
            en: 'Calmness is your superpower. You stay grounded.',
            zh: '平静是你的超能力。你始终脚踏实地。',
            es: 'La calma es tu superpoder.'
        },
        image: getSketchSvg(PATHS.koala, 'E0F2F1'), // Teal bg
        unlockHint: { en: 'Log 3 Calm moods.', zh: '记录 3 次“平静”心情。', es: 'Registra 3 estados de ánimo tranquilos.' },
        checkUnlock: (history) => history.filter(h => h.moodType === 'Calm').length >= 3,
        color: 'bg-teal-100'
    },
    {
        id: 'fox',
        name: { en: 'The Survivor', zh: '幸存者·狐狸', es: 'El Superviviente' },
        description: {
            en: 'Clever and resilient. You navigate stress with adaptability.',
            zh: '聪明且坚韧。你用适应力应对压力。',
            es: 'Inteligente y resistente.'
        },
        image: getSketchSvg(PATHS.fox, 'FFEBEE'), // Red bg
        unlockHint: { en: 'Log a Stressful mood.', zh: '记录一次“紧绷”心情。', es: 'Registra un estado de ánimo estresante.' },
        checkUnlock: (history) => history.some(h => h.moodType === 'Stressful'),
        color: 'bg-red-100'
    },
    {
        id: 'butterfly',
        name: { en: 'The Transformer', zh: '蜕变者·蝴蝶', es: 'El Transformador' },
        description: {
            en: 'Constantly growing. You value the journey of change.',
            zh: '不断成长。你珍视改变的旅程。',
            es: 'Creciendo constantemente.'
        },
        image: getSketchSvg(PATHS.butterfly, 'F3E5F5'), // Pink bg
        unlockHint: { en: 'Reach 5 total entries.', zh: '累计记录 5 篇日记。', es: 'Alcanza 5 entradas totales.' },
        checkUnlock: (history) => history.length >= 5,
        color: 'bg-pink-100'
    },
    {
        id: 'wolf',
        name: { en: 'The Guardian', zh: '守护者·狼', es: 'El Guardián' },
        description: {
            en: 'Loyal and protective. Relationships define your strength.',
            zh: '忠诚且具保护欲。人际关系定义了你的力量。',
            es: 'Leal y protector.'
        },
        image: getSketchSvg(PATHS.wolf, 'ECEFF1'), // Gray bg
        unlockHint: { en: 'Tag an entry with "Relationships".', zh: '使用“人际”标签记录一次。', es: 'Etiqueta una entrada con "Relaciones".' },
        checkUnlock: (history) => history.some(h => h.categories?.includes('Relationships') || h.categories?.includes('人际')),
        color: 'bg-gray-100'
    }
];

export const checkNewUnlocks = (history: MoodEntry[], user: UserState): AnimalDef | null => {
    const currentUnlocked = new Set(user.unlockedAnimals || []);
    const newUnlock = ANIMALS.find(animal => {
        if (currentUnlocked.has(animal.id)) return false;
        return animal.checkUnlock(history, user);
    });
    return newUnlock || null;
};

export const getAnimalDetails = (id: string, lang: 'English' | 'Chinese' | 'Spanish') => {
    const animal = ANIMALS.find(a => a.id === id);
    if (!animal) return null;
    
    const langKey = lang === 'Chinese' ? 'zh' : lang === 'Spanish' ? 'es' : 'en';
    
    return {
        ...animal,
        displayName: animal.name[langKey],
        displayDesc: animal.description[langKey],
        displayHint: animal.unlockHint[langKey]
    };
};
