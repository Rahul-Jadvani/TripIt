import { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import styles from './NetworkIssue.module.css';

export default function NetworkIssue() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const type = params.get('type'); // 'offline' | 'slow'

  const label = useMemo(() => {
    if (type === 'slow') return 'SLOW NETWORK';
    return 'NO INTERNET';
  }, [type]);

  const message = useMemo(() => {
    if (type === 'slow') {
      return "Your connection seems slow. We'll resume once the data loads.";
    }
    return "You appear to be offline. We'll reconnect automatically when back online.";
  }, [type]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <div className={`${styles.notFoundTv} relative transform scale-75 sm:scale-90 md:scale-110 lg:scale-125 origin-center`}>
        <div className={styles.mainWrapper}>
          <div className={styles.main}>
            <div className={styles.antenna}>
              <div className={styles.antennaShadow} />
              <div className={styles.a1} />
              <div className={styles.a1d} />
              <div className={styles.a2} />
              <div className={styles.a2d} />
              <div className={styles.aBase} />
            </div>

            <div className={styles.tv}>
              <div className={styles.curve}>
                <svg className={styles.curveSvg} viewBox="0 0 189.929 189.929">
                  <path d="M70.343,70.343c-30.554,30.553-44.806,72.7-39.102,115.635l-29.738,3.951C-5.442,137.659,11.917,86.34,49.129,49.13 C86.34,11.918,137.664-5.445,189.928,1.502l-3.95,29.738C143.041,25.54,100.895,39.789,70.343,70.343z" />
                </svg>
              </div>
              <div className={styles.displayDiv}>
                <div className={styles.screenOut}>
                  <div className={styles.screenOut1}>
                    <div className={styles.screen}>
                      <span className={styles.notFoundText}>{label}</span>
                    </div>
                    <div className={styles.screenM}>
                      <span className={styles.notFoundText}>{label}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.lines}>
                <div className={styles.line1} />
                <div className={styles.line2} />
                <div className={styles.line3} />
              </div>
              <div className={styles.buttonsDiv}>
                <div className={styles.b1}>
                  <div />
                </div>
                <div className={styles.b2} />
                <div className={styles.speakers}>
                  <div className={styles.g1}>
                    <div className={styles.g11} />
                    <div className={styles.g12} />
                    <div className={styles.g13} />
                  </div>
                  <div className={styles.g} />
                  <div className={styles.g} />
                </div>
              </div>
            </div>

            <div className={styles.bottom}>
              <div className={styles.base1} />
              <div className={styles.base2} />
              <div className={styles.base3} />
            </div>
          </div>
          {/* Network status indicator */}
          <div className={styles.text404}>
            <div className={styles.text4041}>N</div>
            <div className={styles.text4042}>E</div>
            <div className={styles.text4043}>T</div>
          </div>
        </div>

        <div className="mt-6 text-center space-y-2">
          <div className="text-sm text-muted-foreground">
            {message}
          </div>
          <Link to="/" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
            Try Home
          </Link>
        </div>
      </div>
    </div>
  );
}

