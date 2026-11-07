import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import SidebarLayout from '../../components/common/SidebarLayout'
import { receptionItems } from '../../components/common/navItems'
import MemberCounter from '../../components/receptionist/MemberCounter'
import RefundsTab from '../../components/manager/RefundsTab'
import FacilityAttendanceTab from '../../components/receptionist/FacilityAttendanceTab'
import SupportRequestsTab from '../../components/receptionist/SupportRequestsTab'
import styles from '../../css/manager/ManagerDashboard.module.css'

// Tiêu đề và một dòng giải thích cho từng mục: [tiêu đề, mô tả]
const VIEW_INFO = {
  desk: ['Hội viên tại quầy', 'Tìm hoặc tạo hội viên, xác thực email, đăng ký gói và lớp, thu tiền mặt. Bấm vào một hội viên để xử lý.'],
  refunds: ['Hoàn tiền', 'Các khoản hoàn tiền chờ xử lý. Khoản quá hạn nên xử lý trước.'],
  attendance: ['Ra vào trung tâm', 'Ghi hội viên vào và ra trung tâm, chỉ hội viên còn gói hợp lệ mới check-in được.'],
  support: ['Yêu cầu hỗ trợ', 'Ghi lại yêu cầu của hội viên tại quầy và theo dõi tới khi giải quyết xong.'],
}

// Không gian làm việc của lễ tân: hội viên tại quầy, hoàn tiền, ra vào trung tâm, yêu cầu hỗ trợ
export default function ReceptionistDashboard() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('desk')

  useEffect(() => {
    if (!token) navigate('/login')
  }, [token, navigate])

  return (
    <SidebarLayout workspace="RECEPTION WORKSPACE" caption="TIẾP ĐÓN" rootLabel="Không gian Lễ tân" roleLabel="Lễ tân" items={receptionItems} activeId={view} onSelect={setView}>
      <div className={styles.container}>
        <main className={styles.main}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>{VIEW_INFO[view]?.[0]}</h1>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', maxWidth: 760 }}>{VIEW_INFO[view]?.[1]}</p>
            </div>
          </div>

          {view === 'desk' && <MemberCounter />}
          {view === 'refunds' && <RefundsTab />}
          {view === 'attendance' && <FacilityAttendanceTab />}
          {view === 'support' && <SupportRequestsTab />}
        </main>
      </div>
    </SidebarLayout>
  )
}
