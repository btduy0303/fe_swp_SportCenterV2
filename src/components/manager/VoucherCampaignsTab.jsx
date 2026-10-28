import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import VoucherSettings from './VoucherSettings'
import styles from '../../css/manager/ManagerDashboard.module.css'

const EMPTY = { code: '', kind: 'PERCENT', value: 10, appliesTo: 'CLASS', maxUses: '', startsAt: '', endsAt: '' }

// Chiến dịch voucher: tạo mã cho hội viên nhập, xem số lượt dùng, kết thúc sớm
export default function VoucherCampaignsTab() {
  const { token } = useAuth()
  const toast = useToast()
  const [campaigns, setCampaigns] = useState([])
  const [form, setForm] = useState(EMPTY)

  const load = useCallback(async () => {
    try {
      setCampaigns(await managerService.getVoucherCampaigns(token))
    } catch (err) {
      toast.error(err.message || 'Không thể tải chiến dịch voucher')
    }
  }, [token, toast])

  useEffect(() => {
    load()
  }, [load])

  const create = async (e) => {
    e.preventDefault()
    try {
      await managerService.createVoucherCampaign(token, {
        code: form.code.trim(),
        kind: form.kind,
        value: Number(form.value),
        appliesTo: form.appliesTo,
        maxUses: form.maxUses === '' ? null : Number(form.maxUses),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      })
      toast.success('Đã tạo chiến dịch voucher')
      setForm(EMPTY)
      load()
    } catch (err) {
      toast.error(err.message || 'Tạo chiến dịch thất bại')
    }
  }

  const end = async (id) => {
    try {
      await managerService.endVoucherCampaign(token, id)
      toast.success('Đã kết thúc chiến dịch')
      load()
    } catch (err) {
      toast.error(err.message || 'Kết thúc chiến dịch thất bại')
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  return (
    <>
      <VoucherSettings />

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Tạo Chiến Dịch Voucher</h2>
        <form onSubmit={create} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input required className={styles.input} placeholder="Mã (3-40 ký tự)" value={form.code} onChange={set('code')} />
          <select className={styles.select} value={form.kind} onChange={set('kind')}>
            <option value="PERCENT">Giảm %</option>
            <option value="AMOUNT">Giảm tiền</option>
            <option value="FREE_ONE_ON_ONE">Tặng 1 buổi 1-1</option>
          </select>
          <input required type="number" min="0" className={styles.input} placeholder="Giá trị" value={form.value} onChange={set('value')} />
          <select className={styles.select} value={form.appliesTo} onChange={set('appliesTo')}>
            <option value="CLASS">Học phí lớp</option>
            <option value="ONE_ON_ONE">Buổi 1-1</option>
            <option value="PACKAGE">Gói hội viên</option>
          </select>
          <input type="number" min="1" className={styles.input} placeholder="Số lượt tối đa (bỏ trống = không giới hạn)" value={form.maxUses} onChange={set('maxUses')} />
          <input required type="datetime-local" className={styles.input} value={form.startsAt} onChange={set('startsAt')} />
          <input required type="datetime-local" className={styles.input} value={form.endsAt} onChange={set('endsAt')} />
          <button type="submit" className={styles.btnAction}>Tạo Chiến Dịch</button>
        </form>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Danh Sách Chiến Dịch</h2>
        {campaigns.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Chưa có chiến dịch nào.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Mã</th>
                  <th className={styles.th}>Loại</th>
                  <th className={styles.th}>Áp dụng</th>
                  <th className={styles.th}>Đã dùng</th>
                  <th className={styles.th}>Thời gian</th>
                  <th className={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className={styles.row}>
                    <td className={styles.td}><strong>{c.code}</strong></td>
                    <td className={styles.td}>{c.kind} {c.value}</td>
                    <td className={styles.td}>{c.appliesTo}</td>
                    <td className={styles.td}>{c.redeemed}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                    <td className={styles.td}>{new Date(c.startsAt).toLocaleDateString('vi-VN')} – {new Date(c.endsAt).toLocaleDateString('vi-VN')}</td>
                    <td className={styles.td}>
                      {c.active
                        ? <button type="button" className={styles.btnDanger} onClick={() => end(c.id)}>Kết thúc</button>
                        : 'Đã kết thúc'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
