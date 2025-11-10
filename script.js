const TRANSLATIONS_FILE = 'translate.json';

/**
 * Отримує значення з вкладеного об'єкта за ключем-шляхом (наприклад, "cookie_banner.title")
 */
function getValueByPath(obj, path) {
    return path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
}

/**
 * Асинхронно завантажує переклади та локалізує елементи на сторінці.
 */
async function localizeElements() {
    let allTranslations;

    try {
        const response = await fetch(TRANSLATIONS_FILE);
        if (!response.ok) {
            throw new Error(`Не вдалося завантажити ${TRANSLATIONS_FILE}: ${response.statusText}`);
        }
        allTranslations = await response.json();

    } catch (error) {
        console.error("Помилка завантаження або парсингу перекладів:", error);
        return; 
    }

    // Визначаємо мову
    const htmlLang = document.documentElement.getAttribute('lang') || 'ru'; 
    const currentLang = allTranslations.hasOwnProperty(htmlLang) ? htmlLang : 'ru'; 
    
    const langData = allTranslations[currentLang];

    // Локалізуємо всі елементи з атрибутом data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const keyPath = el.getAttribute('data-i18n');
        const translatedText = getValueByPath(langData, keyPath);
        
        if (translatedText) {
            el.textContent = translatedText;
        } else {
             console.warn(`Ключ "${keyPath}" не знайдено для мови "${currentLang}".`);
        }
    });
}

// ОСНОВНА ЛОГІКА: ОБ'ЄДНАНО В ОДИН DOMContentLoaded
document.addEventListener('DOMContentLoaded', function () {
    // *** 1. ЗАПУСК ЛОКАЛІЗАЦІЇ ***
    // Запускаємо асинхронну локалізацію тексту, яка працює паралельно з логікою згоди.
    localizeElements();
    
    // При завантаженні сторінки — якщо є збережений consentMode, відправити подію consent_update в dataLayer
    try {
        var savedConsent = localStorage.getItem('consentMode');
        if (savedConsent) {
            var mode = JSON.parse(savedConsent);
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: 'consent_update',
                consent: {
                    ad_storage: mode.ad_storage,
                    ad_user_data: mode.ad_user_data,
                    ad_personalization: mode.ad_personalization,
                    analytics_storage: mode.analytics_storage,
                    personalization_storage: mode.personalization_storage,
                    functionality_storage: mode.functionality_storage,
                    security_storage: mode.security_storage
                }
            });
        }
    } catch (e) {
        console.warn('Не удалось отправить consent_update при инициализации', e);
    }
    
    // Ініціалізація елементів (змінні залишаються тими самими)
    const cookieConsent = document.getElementById('cookieConsent');
    const cookieMinimized = document.getElementById('cookieMinimized');
    const acceptAllButton = document.querySelector('.accept-all');
    const savePreferencesButton = document.querySelector('.save-preferences');
    const analyticsCheckbox = document.getElementById('analytics');
    const marketingCheckbox = document.getElementById('marketing');
    const personalizationCheckbox = document.getElementById('personalization');
    const rejectAllButton = document.querySelector('.reject-all');

    if (!cookieConsent || !cookieMinimized) return; 

    // ... Весь інший код, що стосується логіки згоди, залишається незмінним:
    // Міграція, setCheckboxesFromConsentMode, Ініціалізація UI, Обробники кнопок, saveConsentSettings, updateGTMConsent ...

    // Функція для установки стану чекбоксов по consentMode
    function setCheckboxesFromConsentMode(modeObj) {
        if (!modeObj) return;
        analyticsCheckbox.checked = modeObj.analytics_storage === 'granted';
        marketingCheckbox.checked = modeObj.ad_storage === 'granted';
        if (personalizationCheckbox) personalizationCheckbox.checked = modeObj.personalization_storage === 'granted';
    }

    // Функція обновления настроек Google Tag Manager
    function updateGTMConsent(mode) {
        if (typeof gtag !== 'function') return;
        try {
            gtag('consent', 'update', mode);
        } catch (e) {
            console.warn('gtag consent update failed', e);
        }
    }
    
    // ... (тут має бути код міграції, що був у вашому оригінальному файлі) ...
    try {
        const legacy = localStorage.getItem('cookieConsent');
        const current = localStorage.getItem('consentMode');
        if (legacy && !current) {
            const legacyObj = JSON.parse(legacy);
            const mode = {
                ad_storage: legacyObj.marketing ? 'granted' : 'denied',
                ad_user_data: legacyObj.marketing ? 'granted' : 'denied',
                ad_personalization: legacyObj.marketing ? 'granted' : 'denied',
                analytics_storage: legacyObj.analytics ? 'granted' : 'denied',
                personalization_storage: legacyObj.marketing ? 'granted' : 'denied',
                functionality_storage: 'granted',
                security_storage: 'granted'
            };
            localStorage.setItem('consentMode', JSON.stringify(mode));
            localStorage.removeItem('cookieConsent');
        }
    } catch (e) {
        console.warn('Consent migration failed', e);
    }

    // Ініціалізація UI в залежності від consentMode
    const savedMode = localStorage.getItem('consentMode');
    if (savedMode) {
        try {
            const modeObj = JSON.parse(savedMode);
            setCheckboxesFromConsentMode(modeObj);
        } catch (e) {
            console.warn('Не удалось распарсить consentMode', e);
        }
        cookieConsent.classList.add('minimized');
        const content = cookieConsent.querySelector('.cookie-content');
        if (content) content.style.display = 'none';
        cookieMinimized.style.display = 'block';
        updateGTMConsent(JSON.parse(savedMode));
    } else {
        // Якщо немає збережених налаштувань — скидаємо чекбокси
        analyticsCheckbox.checked = false;
        marketingCheckbox.checked = false;
        if (personalizationCheckbox) personalizationCheckbox.checked = false;
        cookieConsent.style.display = 'block';
        cookieMinimized.style.display = 'none';
    }

    // Обробник для минимизированной кнопки
    const minimizedButton = cookieMinimized.querySelector('.cookie-button');
    if (minimizedButton) {
        minimizedButton.addEventListener('click', function () {
            // При відкритті баннера завжди актуалізуємо чекбокси по consentMode
            const saved = localStorage.getItem('consentMode');
            if (saved) {
                try {
                    setCheckboxesFromConsentMode(JSON.parse(saved));
                } catch (e) {}
            } else {
                analyticsCheckbox.checked = false;
                marketingCheckbox.checked = false;
                if (personalizationCheckbox) personalizationCheckbox.checked = false;
            }
            cookieConsent.classList.remove('minimized');
            const content = cookieConsent.querySelector('.cookie-content');
            if (content) content.style.display = 'block';
            cookieMinimized.style.display = 'none';
        });
    }

    // Обробники кнопок баннера
    if (acceptAllButton) {
        acceptAllButton.addEventListener('click', function () {
            const consentSettings = { analytics: true, marketing: true, personalization: true };
            saveConsentSettings(consentSettings);
        });
    }

    if (rejectAllButton) {
        rejectAllButton.addEventListener('click', function () {
            const consentSettings = { analytics: false, marketing: false, personalization: false };
            saveConsentSettings(consentSettings);
        });
    }

    if (savePreferencesButton) {
        savePreferencesButton.addEventListener('click', function () {
            const consentSettings = {
                analytics: !!analyticsCheckbox.checked,
                marketing: !!marketingCheckbox.checked,
                personalization: personalizationCheckbox ? !!personalizationCheckbox.checked : false
            };
            saveConsentSettings(consentSettings);
        });
    }

    // Функция сохранения настроек — сохраняем ТОЛЬКО в consentMode
    function saveConsentSettings(settings) {
        const mode = {
            ad_storage: settings.marketing ? 'granted' : 'denied',
            ad_user_data: settings.marketing ? 'granted' : 'denied',
            ad_personalization: settings.marketing ? 'granted' : 'denied',
            analytics_storage: settings.analytics ? 'granted' : 'denied',
            personalization_storage: settings.personalization ? 'granted' : 'denied',
            functionality_storage: 'granted',
            security_storage: 'granted'
        };

        try {
            localStorage.setItem('consentMode', JSON.stringify(mode));
        } catch (e) {
            console.warn('Не удалось сохранить consentMode', e);
        }

        // Після збереження — оновити чекбокси в UI
        setCheckboxesFromConsentMode(mode);

        // Відправити подію consent_update в dataLayer для GTM
        try {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: 'consent_update',
                consent: {
                    ad_storage: mode.ad_storage,
                    ad_user_data: mode.ad_user_data,
                    ad_personalization: mode.ad_personalization,
                    analytics_storage: mode.analytics_storage,
                    personalization_storage: mode.personalization_storage,
                    functionality_storage: mode.functionality_storage,
                    security_storage: mode.security_storage
                }
            });
        } catch (e) {
            console.warn('Не удалось отправить событие consent_update в dataLayer', e);
        }

        // Згорнемо банер і покажемо кнопку
        cookieConsent.classList.add('minimized');
        const content = cookieConsent.querySelector('.cookie-content');
        if (content) content.style.display = 'none';
        cookieMinimized.style.display = 'block';

        // Оновлюємо вже завантажені теги
        updateGTMConsent(mode);
    }
});