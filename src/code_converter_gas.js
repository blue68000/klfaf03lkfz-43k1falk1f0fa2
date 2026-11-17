// main.js （GitHubなどに置くファイル）
(function() {
    // 二重起動防止
    if (window._stealthHoverActive) {
        console.log('✨ すでにホバーツールチップは起動しています。');
        return;
    }
    window._stealthHoverActive = true;

    // ★ ここに先ほど取得したGASのウェブアプリのURLを貼り付ける
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbwfc4weqPC02DWvdo5se0uY8x6y-Mn-SMmzFjcoP9BjPTofSI8Yth_MCfAsobdP16Iz/exec';

    // GASからJSONデータを取得する
    fetch(GAS_URL)
        .then(response => response.json())
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                console.error('❌ GASからのデータ取得に失敗したか、データが空です。');
                return;
            }

            // 辞書データ（Map）の構築
            const codeMap = new Map();
            data.forEach(item => {
                if (item[0] && item[1]) {
                    codeMap.set(item[0], item[1]);
                }
            });

            // ツールチップ用要素の作成
            let tooltip = document.getElementById('stealth-console-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'stealth-console-tooltip';
                tooltip.style.cssText = `
                    position: fixed;
                    display: none;
                    background: #1e293b;
                    color: #f8fafc;
                    padding: 4px 8px;
                    font-size: 12px;
                    border-radius: 4px;
                    pointer-events: none;
                    z-index: 2147483647;
                    white-space: nowrap;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                `;
                document.body.appendChild(tooltip);
            }

            const keys = Array.from(codeMap.keys());
            if (keys.length === 0) return;
            const regex = new RegExp(`(${keys.join('|')})`, 'g');

            // 判定ロジック（プレーンテキスト ＆ input/textarea対応）
            function checkAndShow(doc, clientX, clientY, pageX, pageY, targetElement) {
                let foundValue = null;

                if (targetElement && (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA')) {
                    const val = targetElement.value || '';
                    regex.lastIndex = 0;
                    const match = regex.exec(val);
                    if (match) {
                        foundValue = codeMap.get(match[0]);
                    }
                }

                if (!foundValue) {
                    let textNode = null;
                    let offset = 0;

                    if (doc.caretRangeFromPoint) {
                        const range = doc.caretRangeFromPoint(clientX, clientY);
                        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
                            textNode = range.startContainer;
                            offset = range.startOffset;
                        }
                    }

                    if (textNode) {
                        const text = textNode.nodeValue;
                        regex.lastIndex = 0;
                        let match;
                        while ((match = regex.exec(text)) !== null) {
                            const start = match.index;
                            const end = start + match[0].length;
                            if (offset >= start && offset <= end) {
                                foundValue = codeMap.get(match[0]);
                                break;
                            }
                        }
                    }
                }

                if (foundValue) {
                    tooltip.textContent = foundValue;
                    tooltip.style.display = 'block';
                    tooltip.style.top = (pageY + 15) + 'px';
                    tooltip.style.left = (pageX + 15) + 'px';
                    return true;
                }
                return false;
            }

            // イベント監視のセットアップ（親＋iframe対応）
            function attachEvents(targetDoc, iframeElement) {
                targetDoc.addEventListener('mousemove', (e) => {
                    let clientX = e.clientX;
                    let clientY = e.clientY;
                    let pageX = e.pageX;
                    let pageY = e.pageY;
                    let targetEl = e.target;

                    if (iframeElement) {
                        const rect = iframeElement.getBoundingClientRect();
                        pageX = e.clientX + rect.left + window.scrollX;
                        pageY = e.clientY + rect.top + window.scrollY;
                    }

                    const hit = checkAndShow(targetDoc, clientX, clientY, pageX, pageY, targetEl);

                    if (!hit && targetDoc === document) {
                        let foundInIframe = false;
                        const iframes = document.querySelectorAll('iframe');
                        for (const iframe of iframes) {
                            try {
                                const iframeDoc = iframe.contentDocument;
                                if (iframeDoc) {
                                    const rect = iframe.getBoundingClientRect();
                                    if (e.clientX >= rect.left && e.clientX <= rect.right &&
                                        e.clientY >= rect.top && e.clientY <= rect.bottom) {
                                        
                                        const innerClientX = e.clientX - rect.left;
                                        const innerClientY = e.clientY - rect.top;
                                        const innerTarget = iframeDoc.elementFromPoint(innerClientX, innerClientY);
                                        
                                        if (checkAndShow(iframeDoc, innerClientX, innerClientY, e.pageX, e.pageY, innerTarget)) {
                                            foundInIframe = true;
                                            break;
                                        }
                                    }
                                }
                            } catch (err) {}
                        }
                        if (!foundInIframe) {
                            tooltip.style.display = 'none';
                        }
                    }
                });
            }

            attachEvents(document, null);

            document.querySelectorAll('iframe').forEach(iframe => {
                try {
                    if (iframe.contentDocument) {
                        attachEvents(iframe.contentDocument, iframe);
                    }
                } catch (err) {}
            });

            console.log('✨ 【GAS連携・完全版】ホバーツールチップシステムが起動しました！');
        })
        .catch(err => {
            console.error('❌ GASからのデータ取得に失敗しました:', err);
        });
})();
