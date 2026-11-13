import { Link } from 'react-router-dom'
import { BrandLogo } from '@apitech/brand'
import { useAuth } from '../../features/auth/auth-context'
import './landing.css'

const topics = [
  {
    number: '01',
    title: 'CAN Education',
    thai: 'เชื่อมทฤษฎีเข้ากับภาพที่เข้าใจ',
    description:
      'สื่อประกอบการสอนเรื่องเครือข่าย CAN และการสื่อสารระหว่างหน่วยควบคุมในรถไฟฟ้า',
    tag: 'KNOWLEDGE',
    icon: 'book',
  },
  {
    number: '02',
    title: 'EV System Explorer',
    thai: 'เห็นระบบ ก่อนลงลึกในรายละเอียด',
    description:
      'สำรวจองค์ประกอบของรถ EV และความสัมพันธ์ระหว่างแบตเตอรี่ ชุดควบคุม และมอเตอร์',
    tag: 'SYSTEM THINKING',
    icon: 'network',
  },
  {
    number: '03',
    title: 'EV Component Lab',
    thai: 'เปลี่ยนชิ้นส่วนให้เป็นสื่อการสอน',
    description:
      'ดูโครงสร้างมอเตอร์ผ่านโมเดล 3D ทั้งแบบประกอบ เปิดภายใน และแยกชิ้นส่วน',
    tag: 'VISUAL LEARNING',
    icon: 'component',
  },
] as const

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TopicIcon({ type }: { type: (typeof topics)[number]['icon'] }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {type === 'book' ? (
        <>
          <path d="M16 8c-4-3-9-3-12-2v20c4-1 8-1 12 2 4-3 8-3 12-2V6c-3-1-8-1-12 2v20" />
          <path d="m8 11 4 1m-4 4 4 1m8-5 4-1m-4 6 4-1" />
        </>
      ) : type === 'network' ? (
        <>
          <rect x="11" y="2" width="10" height="8" rx="2" />
          <rect x="2" y="22" width="10" height="8" rx="2" />
          <rect x="20" y="22" width="10" height="8" rx="2" />
          <path d="M16 10v6H7v6m9-6h9v6" />
        </>
      ) : (
        <>
          <path d="m16 2 13 7v14l-13 7L3 23V9l13-7Zm0 14v14M3 9l13 7 13-7M9 6l14 7v7" />
          <path d="m8 20 4 2" />
        </>
      )}
    </svg>
  )
}

/** A lightweight educational illustration; no simulator or WebGL is loaded on the public page. */
function SystemIllustration() {
  return (
    <div className="landing-system">
      <div className="landing-system-heading">
        <span>
          <i />
          EV SYSTEM OVERVIEW
        </span>
        <span>ILLUSTRATION / 01</span>
      </div>
      <svg
        className="landing-system-drawing"
        viewBox="0 0 600 430"
        role="img"
        aria-label="ภาพประกอบแบตเตอรี่ส่งพลังงานผ่านอินเวอร์เตอร์ไปยังมอเตอร์ โดยมีเครือข่าย CAN เชื่อมหน่วยควบคุม"
      >
        <defs>
          <pattern
            id="ev-landing-grid"
            width="36"
            height="36"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M36 0H0v36"
              fill="none"
              stroke="#7393a4"
              strokeOpacity=".12"
            />
          </pattern>
          <linearGradient id="ev-landing-cell" x2="0" y2="1">
            <stop stopColor="#386274" />
            <stop offset="1" stopColor="#1b333f" />
          </linearGradient>
          <linearGradient id="ev-landing-metal" x2="1" y2="1">
            <stop stopColor="#8a9caa" />
            <stop offset=".5" stopColor="#425462" />
            <stop offset="1" stopColor="#253442" />
          </linearGradient>
        </defs>
        <rect width="600" height="430" fill="url(#ev-landing-grid)" />
        <path
          d="m53 281 208 119 287-164-207-120Z"
          fill="#101c23"
          stroke="#3f5965"
          strokeOpacity=".45"
        />
        <path
          d="m53 281 208 119v10L53 291Zm208 119 287-164v10L261 410Z"
          fill="#15232c"
        />
        <g strokeLinejoin="round">
          <path
            d="m89 231 110 63 100-57-110-63Z"
            fill="#29404b"
            stroke="#6d8c97"
          />
          <path d="m89 231 110 63v36L89 267Z" fill="#1b303a" stroke="#496573" />
          <path
            d="m199 294 100-57v36l-100 57Z"
            fill="#122731"
            stroke="#496573"
          />
          {Array.from({ length: 5 }, (_, i) => (
            <g key={i} transform={`translate(${i * 18} ${i * 10.3})`}>
              <path
                d="m101 228 71-41 13 7-71 41Z"
                fill="url(#ev-landing-cell)"
                stroke="#6998a6"
                strokeWidth=".7"
              />
              <path
                d="m114 235 71-41v15l-71 41Z"
                fill="#264a58"
                stroke="#3a6270"
                strokeWidth=".6"
              />
            </g>
          ))}
          <path
            d="m318 169 63 36 69-40-63-36Z"
            fill="url(#ev-landing-metal)"
            stroke="#8ba1ad"
          />
          <path d="m318 169 63 36v42l-63-36Z" fill="#293d4a" stroke="#65818f" />
          <path d="m381 205 69-40v42l-69 40Z" fill="#1e303c" stroke="#65818f" />
          {Array.from({ length: 5 }, (_, i) => (
            <path
              key={i}
              d={`m${330 + i * 9} ${165 + i * 5.2} 45-26`}
              stroke="#a2b4be"
              strokeOpacity=".65"
            />
          ))}
          <path
            d="m377 275 49 28 76-44-49-28Z"
            fill="#22333c"
            stroke="#587786"
          />
          <path
            d="m377 275 49 28v13l-49-28Zm49 28 76-44v13l-76 44Z"
            fill="#182b35"
            stroke="#496470"
          />
          <path
            d="M406 234 449 209c18-11 45 35 27 46l-43 25Z"
            fill="url(#ev-landing-metal)"
            stroke="#9fb1ba"
          />
          <ellipse
            cx="419"
            cy="257"
            rx="21"
            ry="29"
            transform="rotate(-30 419 257)"
            fill="#2a414e"
            stroke="#8ea5b2"
            strokeWidth="2"
          />
          <ellipse
            cx="419"
            cy="257"
            rx="13"
            ry="20"
            transform="rotate(-30 419 257)"
            fill="#d57744"
            stroke="#f4af7d"
          />
          <path d="m419 257-34 20" stroke="#a5b8c1" strokeWidth="9" />
          <path
            d="m434 223 19 32m-11-36 18 32m-9-37 17 30"
            stroke="#a6b7c1"
            strokeOpacity=".5"
            strokeWidth="2"
          />
        </g>
        <g fill="none" stroke="#fb8c52" strokeWidth="3" strokeLinecap="round">
          <path d="m269 225 25-14v-34l23-13" />
          <path d="m421 218 14 8" />
        </g>
        <path
          d="M150 155v-48h340v73"
          fill="none"
          stroke="#68b7c2"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />
        <g fill="#86c6ca">
          <circle cx="150" cy="155" r="3" />
          <circle cx="490" cy="180" r="3" />
        </g>
        <g
          fontFamily="ui-monospace, monospace"
          fontSize="10"
          letterSpacing="1.5"
        >
          <text x="85" y="355" fill="#a1b4c0">
            01 / BATTERY PACK
          </text>
          <text x="315" y="115" fill="#a1b4c0">
            02 / INVERTER
          </text>
          <text x="416" y="346" fill="#a1b4c0">
            03 / MOTOR
          </text>
          <text x="246" y="92" fill="#86c6ca">
            CAN COMMUNICATION
          </text>
        </g>
        <path
          d="M140 341v-38m258-194V90m63 237v-29"
          stroke="#728a98"
          strokeOpacity=".5"
        />
      </svg>
      <div className="landing-system-footer">
        <span>
          <i className="power" />
          เส้นทางพลังงาน
        </span>
        <span>
          <i className="can" />
          การสื่อสาร CAN
        </span>
        <small>ภาพประกอบระบบ · ไม่ใช่ข้อมูลจำลองสด</small>
      </div>
    </div>
  )
}

export function LandingPage() {
  const { session, access } = useAuth()
  const member = Boolean(session && access)
  const actionLabel = member
    ? access?.can_access_education
      ? 'เข้าสู่ห้องเรียน'
      : 'ตรวจสถานะสมาชิก'
    : 'เข้าสู่ระบบ'
  const actionPath = member
    ? access?.can_access_education
      ? '/learn'
      : '/membership'
    : '/login'
  return (
    <div className="landing-page">
      <a className="landing-skip" href="#landing-main">
        ข้ามไปเนื้อหาหลัก
      </a>
      <header className="landing-header landing-container">
        <Link
          to="/"
          className="landing-brand"
          aria-label="APITech CAN Education หน้าแรก"
        >
          <BrandLogo />
          <small>CAN EDUCATION</small>
        </Link>
        <nav aria-label="เมนูหลัก">
          <a href="#learning">สื่อการสอน</a>
          <a href="#getting-started">เริ่มใช้งาน</a>
        </nav>
        <Link className="landing-button landing-button-small" to={actionPath}>
          {actionLabel}
          <Arrow />
        </Link>
      </header>
      <main id="landing-main">
        <section
          className="landing-hero landing-container"
          aria-labelledby="landing-title"
        >
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">
              <span />
              BUILT FOR THE EV CLASSROOM
            </p>
            <h1 id="landing-title">
              เปิดมุมมองใหม่
              <br />
              ให้ห้องเรียน <em>EV.</em>
            </h1>
            <p className="landing-lead">จากชิ้นส่วน สู่ระบบ สู่การสื่อสาร</p>
            <p className="landing-description">
              สื่อการสอนออนไลน์สำหรับอาจารย์
              เพื่ออธิบายโครงสร้างรถไฟฟ้าและเครือข่าย CAN ให้เห็นภาพ เข้าใจง่าย
              และชวนผู้เรียนสำรวจไปด้วยกัน
            </p>
            <div className="landing-hero-actions">
              <Link className="landing-button" to={actionPath}>
                {actionLabel}
                <Arrow />
              </Link>
              <a className="landing-text-link" href="#learning">
                สำรวจสื่อการสอน
                <Arrow diagonal />
              </a>
            </div>
            <div className="landing-hero-note">
              <span>FOR INSTRUCTORS</span>
              <p>
                ใช้งานผ่านเว็บเบราว์เซอร์
                <br />
                สมัครสมาชิกและรับการอนุมัติก่อนเข้าเรียน
              </p>
            </div>
          </div>
          <div className="landing-hero-visual">
            <div className="landing-visual-caption">
              <span>CONNECT THE IDEAS.</span>
              <span>UNDERSTAND THE SYSTEM.</span>
            </div>
            <SystemIllustration />
            <p className="landing-visual-note">
              มองเห็นความสัมพันธ์ ก่อนอธิบายการทำงาน
            </p>
          </div>
        </section>
        <div className="landing-discipline">
          <div className="landing-container">
            <span>ONE PLATFORM. CONNECTED LEARNING.</span>
            <p>
              EV ARCHITECTURE
              <i />
              COMPONENT EXPLORATION
              <i />
              CAN COMMUNICATION
            </p>
          </div>
        </div>
        <section
          id="learning"
          className="landing-learning landing-container"
          aria-labelledby="learning-title"
        >
          <div className="landing-section-heading">
            <div>
              <p className="landing-eyebrow">THE LEARNING SPACE</p>
              <h2 id="learning-title">เรื่องซับซ้อน อธิบายให้เห็นภาพได้</h2>
            </div>
            <p>
              จัดพื้นที่การเรียนรู้เป็นหมวดหมู่
              <br />
              เพื่อหยิบมาใช้ประกอบการสอนได้ตรงเรื่อง
            </p>
          </div>
          <div className="landing-topics">
            {topics.map((topic) => (
              <article className="landing-topic" key={topic.number}>
                <div className="landing-topic-top">
                  <TopicIcon type={topic.icon} />
                  <span>/{topic.number}</span>
                </div>
                <p className="landing-topic-tag">{topic.tag}</p>
                <h3>{topic.title}</h3>
                <p className="landing-topic-thai">{topic.thai}</p>
                <p className="landing-topic-description">{topic.description}</p>
              </article>
            ))}
          </div>
        </section>
        <section
          id="getting-started"
          className="landing-start landing-container"
          aria-labelledby="start-title"
        >
          <div>
            <p className="landing-eyebrow">YOUR CLASSROOM STARTS HERE</p>
            <h2 id="start-title">
              พร้อมสำหรับ
              <br />
              <span>บทเรียนครั้งต่อไป</span>
            </h2>
            <p className="landing-description">
              สร้างบัญชีอาจารย์เพียงครั้งเดียว
              เพื่อเข้าถึงสื่อการสอนทุกหมวดหลังได้รับการอนุมัติจากผู้ดูแล
            </p>
            <Link
              className="landing-text-link"
              to={member ? actionPath : '/register'}
            >
              {member ? actionLabel : 'สมัครบัญชีอาจารย์'}
              <Arrow />
            </Link>
          </div>
          <ol className="landing-steps">
            <li>
              <span>01</span>
              <div>
                <h3>สมัครบัญชีอาจารย์</h3>
                <p>กรอกชื่อ อีเมล และข้อมูลสถาบันของคุณ</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>ยืนยันอีเมลและรออนุมัติ</h3>
                <p>เปิดลิงก์ในอีเมล แล้วตรวจสถานะคำขอในระบบ</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>เปิดพื้นที่การสอน</h3>
                <p>เข้าสู่ระบบและเลือกหมวดที่ต้องการใช้ในห้องเรียน</p>
              </div>
            </li>
          </ol>
        </section>
        <section
          className="landing-closing landing-container"
          aria-label="เข้าสู่พื้นที่การสอน"
        >
          <div>
            <p className="landing-eyebrow">
              LESS SCROLLING. MORE UNDERSTANDING.
            </p>
            <h2>ให้ความเข้าใจ เริ่มจากการมองเห็น</h2>
          </div>
          <Link className="landing-button" to={actionPath}>
            {actionLabel}
            <Arrow />
          </Link>
        </section>
      </main>
      <footer className="landing-footer landing-container">
        <span>
          APITECH <i>/</i> CAN EDUCATION
        </span>
        <p>สื่อประกอบการสอนระบบรถไฟฟ้าและการสื่อสาร CAN</p>
        <a href="#landing-main">กลับขึ้นด้านบน ↑</a>
      </footer>
    </div>
  )
}
