const fs = require('fs');
const readline = require('readline');

const DB_FILE = 'modren_id_pass.txt';

// تحميل قاعدة البيانات
function loadDatabase() {
    const db = new Map();
    try {
        const content = fs.readFileSync(DB_FILE, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && trimmed.includes(':')) {
                const [id, pass] = trimmed.split(':');
                db.set(id.trim(), pass.trim());
            }
        }
        console.log(`📚 تم تحميل ${db.size} سجل من قاعدة البيانات`);
    } catch (err) {
        console.log(`❌ خطأ: ${err.message}`);
    }
    return db;
}

// البحث عن رقم الجلوس
function search(db, studentId) {
    return db.get(studentId);
}

// عرض النتيجة
function showResult(studentId, password) {
    console.log('\n' + '='.repeat(40));
    console.log(`🆔 رقم الجلوس: ${studentId}`);
    if (password) {
        console.log(`🔑 كلمة المرور: ${password}`);
        console.log(`✅ تم العثور على النتيجة`);
    } else {
        console.log(`❌ لم يتم العثور على رقم الجلوس ${studentId}`);
    }
    console.log('='.repeat(40) + '\n');
}

// ========== المدخل الرئيسي ==========
const db = loadDatabase();

// الحالة 1: تم تمرير رقم الجلوس كمعامل
if (process.argv.length > 2) {
    const studentId = process.argv[2];
    const password = search(db, studentId);
    showResult(studentId, password);
    process.exit(password ? 0 : 1);
}

// الحالة 2: الوضع التفاعلي
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n🔍 أداة البحث عن كلمة المرور');
console.log('📝 أدخل رقم الجلوس للبحث (اكتب "exit" للخروج)\n');

function ask() {
    rl.question('🆔 رقم الجلوس: ', (input) => {
        const id = input.trim();
        if (id.toLowerCase() === 'exit' || id.toLowerCase() === 'خروج') {
            console.log('👋 تم الخروج');
            rl.close();
            return;
        }
        
        if (id === '') {
            console.log('⚠️ الرجاء إدخال رقم الجلوس\n');
            ask();
            return;
        }
        
        const password = search(db, id);
        showResult(id, password);
        ask();
    });
}

ask();