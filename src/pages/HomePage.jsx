import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/barlow-condensed/800.css'
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import '../css/home/landing.css'
import LandingNavbar from '../components/home/LandingNavbar'
import LandingFooter from '../components/home/LandingFooter'
import HeroBanner from '../components/home/HeroBanner'
import Marquee from '../components/home/Marquee'
import SportPanels from '../components/home/SportPanels'
import PackageSection from '../components/home/PackageSection'
import ClassSection from '../components/home/ClassSection'
import ScheduleSection from '../components/home/ScheduleSection'
import CoachSection from '../components/home/CoachSection'
import VoucherSection from '../components/home/VoucherSection'
import FacilitySection from '../components/home/FacilitySection'
import StepsSection from '../components/home/StepsSection'
import { packageService } from '../services/packageService'
import { classService } from '../services/classService'

// Trang chủ chính của hệ thống Sport Center (landing G6)
export default function HomePage() {
  const [packages, setPackages] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const { hash } = useLocation()

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

  // Link kiểu /#packages từ trang khác: cuộn tới mục sau khi các mục đã render
  useEffect(() => {
    if (hash && !loading) document.querySelector(hash)?.scrollIntoView()
  }, [hash, loading])

  return (
    <div className="g6">
      <LandingNavbar />
      <main>
        <HeroBanner />
        <Marquee />
        <SportPanels />
        <PackageSection packages={packages} loading={loading} />
        <ClassSection classes={classes} loading={loading} />
        <ScheduleSection />
        <CoachSection />
        <VoucherSection />
        <FacilitySection />
        <StepsSection />
      </main>
      <LandingFooter />
    </div>
  )
}
