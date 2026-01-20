import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 관리자 비밀번호 (환경변수에서 가져옴)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '3325';

export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // GET: 데이터 조회 (누구나 가능)
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('ccr_data')
                .select('*')
                .eq('id', 'main')
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            // 데이터가 없으면 기본값 반환
            if (!data) {
                return res.status(200).json({
                    settings: null,
                    calendarData: {}
                });
            }

            return res.status(200).json({
                settings: data.settings,
                calendarData: data.calendar_data || {}
            });
        }

        // POST: 데이터 저장 (관리자만)
        if (req.method === 'POST') {
            const adminKey = req.headers['x-admin-key'];
            
            // 비밀번호 검증
            if (adminKey !== ADMIN_PASSWORD) {
                return res.status(401).json({ error: '비밀번호가 틀렸습니다.' });
            }

            const { settings, calendarData } = req.body;

            // Upsert (insert or update)
            const { error } = await supabase
                .from('ccr_data')
                .upsert({
                    id: 'main',
                    settings: settings,
                    calendar_data: calendarData,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            return res.status(200).json({ success: true, message: '저장되었습니다.' });
        }

        // 비밀번호 확인 엔드포인트
        if (req.method === 'PUT') {
            const { password } = req.body;
            
            if (password === ADMIN_PASSWORD) {
                return res.status(200).json({ valid: true });
            } else {
                return res.status(401).json({ valid: false, error: '비밀번호가 틀렸습니다.' });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
}
