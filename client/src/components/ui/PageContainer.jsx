import Navbar from './Navbar'

export default function PageContainer({ children, className = '', navigate, showFooter = true }) {
  return (
    <div className={`page ${className}`.trim()}>
      <Navbar navigate={navigate} />
      <main>{children}</main>
      {showFooter ? (
        <footer className="footer">
          <span>CodeRoom</span>
          <span>Build / Review / Ship / Repeat</span>
        </footer>
      ) : null}
    </div>
  )
}
