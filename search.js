const fs = require('fs');
const readline = require('readline');
const { exec } = require('child_process');

const DB_FILE = 'modren_id_pass.txt';

// تحميل قاعدة البيانات المحلية
function loadDatabase() {
    const db = new Map();
    try {
        if (fs.existsSync(DB_FILE)) {
            const content = fs.readFileSync(DB_FILE, 'utf8');
            const lines = content.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && trimmed.includes(':')) {
                    const [id, pass] = trimmed.split(':');
                    db.set(id.trim(), pass.trim());
                }
            }
            console.log(`📚 تم تحميل ${db.size} سجل من قاعدة البيانات المحلية`);
        } else {
            console.log(`⚠️ ملف قاعدة البيانات غير موجود، سيتم إنشاؤه عند أول بحث ناجح`);
        }
    } catch (err) {
        console.log(`❌ خطأ في تحميل قاعدة البيانات: ${err.message}`);
    }
    return db;
}

// حفظ نتيجة جديدة في قاعدة البيانات
function saveToDatabase(studentId, password) {
    try {
        fs.appendFileSync(DB_FILE, `${studentId}:${password}\n`, 'utf8');
        console.log(`💾 تم حفظ الرقم ${studentId} في قاعدة البيانات`);
        return true;
    } catch (err) {
        console.log(`❌ خطأ في الحفظ: ${err.message}`);
        return false;
    }
}

// البحث الأونلاين باستخدام get_pass.py
function searchOnline(studentId) {
    return new Promise((resolve, reject) => {
        console.log(`🌐 جاري البحث الأونلاين عن الرقم ${studentId}...`);
        console.log(`⏱️ قد يستغرق هذا دقيقة كاملة`);
        
        const command = `python get_pass.py --id ${studentId} --online`;
        
        exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
            const output = stdout + stderr;
            
            // البحث عن النتيجة
            const foundMatch = output.match(/PASSWORD_FOUND:(\d+)/);
            if (foundMatch) {
                const password = foundMatch[1];
                resolve(password);
            } else if (output.includes('PASSWORD_NOT_FOUND')) {
                reject(new Error('كلمة المرور غير موجودة في النطاق المحدد'));
            } else if (error) {
                reject(new Error(`خطأ في التنفيذ: ${error.message}`));
            } else {
                reject(new Error('خطأ غير معروف'));
            }
        });
    });
}

// البحث عن رقم الجلوس (محلياً أولاً)
async function search(studentId) {
    // 1. البحث في الملف المحلي أولاً
    const db = loadDatabase();
    const localPassword = db.get(studentId);
    
    if (localPassword) {
        return { found: true, password: localPassword, source: 'local' };
    }
    
    // 2. إذا لم يوجد، البحث أونلاين
    console.log(`\n⚠️ الرقم ${studentId} غير موجود في قاعدة البيانات المحلية`);
    console.log(`🔍 سيتم البحث أونلاين...\n`);
    
    try {
        const onlinePassword = await searchOnline(studentId);
        // حفظ النتيجة في قاعدة البيانات للمرة القادمة
        saveToDatabase(studentId, onlinePassword);
        return { found: true, password: onlinePassword, source: 'online' };
    } catch (err) {
        return { found: false, error: err.message };
    }
}

// عرض النتيجة
function showResult(studentId, result) {
    console.log('\n' + '='.repeat(45));
    console.log(`🆔 رقم الجلوس: ${studentId}`);
    
    if (result.found) {
        console.log(`🔑 كلمة المرور: ${result.password}`);
        if (result.source === 'local') {
            console.log(`📁 المصدر: قاعدة البيانات المحلية`);
        } else {
            console.log(`🌐 المصدر: بحث أونلاين (تم حفظه محلياً)`);
        }
        console.log(`✅ تم العثور على النتيجة`);
    } else {
        console.log(`❌ فشل البحث عن الرقم ${studentId}`);
        console.log(`⚠️ السبب: ${result.error}`);
    }
    console.log('='.repeat(45) + '\n');
}

// ========== المدخل الرئيسي ==========

// الحالة 1: تمرير رقم الجلوس كمعامل
if (process.argv.length > 2) {
    const studentId = process.argv[2];
    search(studentId).then(result => {
        showResult(studentId, result);
        process.exit(result.found ? 0 : 1);
    });
    return;
}

// الحالة 2: الوضع التفاعلي
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n🔍 أداة البحث عن كلمة المرور (مع بحث أونلاين)');
console.log('📝 أدخل رقم الجلوس للبحث');
console.log('💡 إذا لم يوجد محلياً، سيتم البحث أونلاين تلقائياً');
console.log('📌 اكتب "exit" للخروج\n');

function ask() {
    rl.question('🆔 رقم الجلوس: ', async (input) => {
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
        
        const result = await search(id);
        showResult(id, result);
        ask();
    });
}

ask();
