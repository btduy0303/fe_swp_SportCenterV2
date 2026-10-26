import React, { useEffect, useState } from 'react'
import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'
import HeroBanner from '../components/home/HeroBanner'
import PackageSection from '../components/home/PackageSection'
import ClassSection from '../components/home/ClassSection'
import ScheduleSection from '../components/home/ScheduleSection'
import { packageService } from '../services/packageService'
import { classService } from '../services/classService'

// Trang chủ chính của hệ thống Sport Center
export default function HomePage() {
  const [packages, setPackages] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  // Gọi service lấy dữ liệu khi trang được mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [pkgList, classList] = await Promise.all([
          packageService.getActivePackages(),
          classService.getOpenClasses(),
        ])
        setPackages(pkgList)
        setClasses(classList)
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu trang chủ:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <HeroBanner />
        <PackageSection packages={packages} loading={loading} />
        <ClassSection classes={classes} loading={loading} />
        <ScheduleSection />
      </main>
      <Footer />
    </div>
  )
}
