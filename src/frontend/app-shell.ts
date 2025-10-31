import type { Env } from "../env";

export function appHtml(env: Env, returnUrlParam: string | null) {
  const returnLink = returnUrlParam || env.RETURN_DEFAULT;

  const css = String.raw`
:root { color-scheme: dark; --bg:#0b0f10; --card:#11181a; --muted:#6b7f7a; --fg:#e9ffef; --brand:#52ff99; --warn:#ffcc66; --err:#ff7a7a; --ok:#7dffa1; }
*{box-sizing:border-box}
html,body,#root{height:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 'Inter',system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
a{color:var(--brand);text-decoration:none}
.nav{display:flex;gap:.75rem;align-items:center;padding:.75rem 1rem;border-bottom:1px solid #17322a;background:#0d1415;position:sticky;top:0;z-index:10}
.nav .brand{display:flex;align-items:center;gap:.5rem;font-weight:600;font-size:15px}
.tag{padding:.1rem .5rem;border-radius:.5rem;background:#143c2c;color:#72ffb6;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
.sp{flex:1}
.btn{background:#123026;border:1px solid #1d4a39;color:var(--fg);padding:.5rem .85rem;border-radius:.6rem;cursor:pointer;font-weight:500}
.btn:hover{background:#173a2e}
.btn.ghost{background:transparent;color:var(--muted);border-color:#1d4032}
.btn.ghost.active{color:var(--fg);background:#123026}
.wrap{max-width:1180px;margin:0 auto;padding:1.2rem}
.grid{display:grid;gap:1rem}
.grid.kpis{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.grid.auto{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.75rem}
.card{background:var(--card);border:1px solid #15352a;border-radius:1rem;padding:1rem;box-shadow:0 10px 25px rgba(0,0,0,0.18)}
.card.tight{padding:.75rem}
.card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem}
.card-title{font-size:16px;font-weight:600}
.muted{color:var(--muted)}
.hero{font-size:32px;font-weight:600}
.large-number{font-size:32px;font-weight:600}
.subdued{color:#889a94;font-size:12px}
.pill{display:inline-flex;align-items:center;gap:.35rem;padding:.2rem .55rem;border-radius:999px;background:#133126;color:#7dffa1;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
.pill.warn{background:#3a2e1a;color:var(--warn)}
.pill.error{background:#3a1f1f;color:var(--err)}
.chip{background:#102119;border:1px solid #1f4532;border-radius:.6rem;padding:.2rem .55rem;font-size:12px;display:inline-flex;align-items:center;gap:.3rem;color:#7dffa1}
.chip.warn{border-color:#4d3c20;color:var(--warn);background:#2a2113}
.chip.error{border-color:#4a2020;color:var(--err);background:#2a1414}
table{width:100%;border-collapse:collapse}
.table th,.table td{padding:.55rem .65rem;border-bottom:1px solid #163226;text-align:left;font-size:13px}
.table tr:hover{background:rgba(82,255,153,0.05)}
.status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff7a7a}
.status-dot.ok{background:#7dffa1}
.sparkline{width:100%;height:60px}
.list{display:flex;flex-direction:column;gap:.8rem}
.list-item{display:flex;justify-content:space-between;align-items:flex-start;border:1px solid #163226;border-radius:.85rem;padding:.85rem;background:#0f1716;gap:.75rem}
.list-item .meta{font-size:12px;color:var(--muted)}
.metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.75rem}
.metric-tile{background:#101918;border:1px solid #1b382f;border-radius:.85rem;padding:.75rem}
.metric-label{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em}
.metric-value{margin-top:.35rem;font-size:20px;font-weight:600}
.metric-sub{color:#86a59c;font-size:12px;margin-top:.2rem}
.checklist{display:flex;flex-direction:column;gap:.45rem;margin-top:.6rem}
.check-item{display:flex;justify-content:space-between;align-items:center;background:#101b19;border:1px solid #1b382f;border-radius:.7rem;padding:.45rem .6rem}
.check-item.fail{background:#1a1111;border-color:#3e1c1c}
.check-item span{font-size:13px}
.progress-bar{background:#132320;border-radius:999px;overflow:hidden;height:8px;margin-top:.4rem}
.progress-bar > div{height:100%;background:linear-gradient(90deg,#1fcc78,#52ff99)}
input,select{background:#0e1516;border:1px solid #193a30;color:var(--fg);border-radius:.6rem;padding:.5rem .6rem;font-size:14px}
.flex{display:flex;gap:1rem;flex-wrap:wrap}
.two-column{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem}
.empty{color:var(--muted);font-style:italic}
.tabs{display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap}
.stack{display:flex;flex-direction:column;gap:.75rem}
.callout{background:#11231d;border:1px solid #1d4032;border-radius:.8rem;padding:.75rem;font-size:13px;color:#7dffa1}
.callout.warn{background:#2a2113;border-color:#4a3a1a;color:var(--warn)}
.callout.error{background:#2a1414;border-color:#4a2020;color:var(--err)}
.min-table{max-height:320px;overflow:auto}
.chart-card{padding:0}
.chart-card svg{display:block;width:100%;height:160px}
.section-title{font-size:18px;margin:0 0 .5rem 0;font-weight:600}
.link{color:var(--brand);text-decoration:none}
.link:hover{text-decoration:underline}
.mono{font-family:'JetBrains Mono',monospace}
.badge{border:1px solid #2b5a49;border-radius:.4rem;padding:.2rem .45rem;font-size:12px}
.pill + .pill{margin-left:.4rem}
.card-group{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem}
.history-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem}
.history-card{background:#101918;border:1px solid #1b382f;border-radius:.75rem;padding:.6rem .75rem}
.history-card strong{font-size:16px}
@media (max-width:720px){.nav{flex-wrap:wrap;gap:.5rem}.nav .sp{display:none}.grid.kpis{grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}}

`;

  const js = String.raw`
const e=React.createElement;
const root=ReactDOM.createRoot(document.getElementById('root'));
const api=path=>fetch(path,{headers:{}}).then(r=>r.ok?r.json():Promise.reject(r));
const qs=new URLSearchParams(location.search);
const RETURN_URL = qs.get('return') || ${JSON.stringify(returnLink)};

function useMe(){
  const [me,setMe]=React.useState(null);
  const [err,setErr]=React.useState(null);
  React.useEffect(()=>{
    api('/api/me').then(setMe).catch(()=>setErr(true));
  },[]);
  return {me,err};
}

function TopNav({me}){
  return e('div',{className:'nav'},
    e('div',{className:'brand'}, e('img',{src:'/assets/GREENBRO LOGO APP.svg',height:24,alt:'GreenBro'}),'GreenBro Dashboard'),
    e('span',{className:'tag'}, me? (me.roles && me.roles.length? me.roles.join(', ') : 'no-role') : 'guest'),
    e('div',{className:'sp'}),
    e('a',{href:'/app/logout?return='+encodeURIComponent(RETURN_URL),className:'btn'},'Logout')
  );
}

function Page({title,children,actions}){
  return e('div',null,
    e('div',{className:'wrap'},
      e('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'1rem',flexWrap:'wrap'}},
        e('h2',{style:{margin:0}},title),
        actions || null
      ),
      children
    )
  );
}

function formatNumber(value,dp=1){
  if(value===null||value===undefined||Number.isNaN(value)) return '—';
  const mult=Math.pow(10,dp);
  return String(Math.round(value*mult)/mult);
}

function formatPercent(value,dp=0){
  if(value===null||value===undefined||Number.isNaN(value)) return '—';
  return formatNumber(value,dp)+'%';
}

function formatRelative(ts){
  if(!ts) return '—';
  const d=new Date(ts);
  if(Number.isNaN(d.getTime())) return ts;
  const diff=Date.now()-d.getTime();
  const suffix=diff>=0?'ago':'from now';
  const ms=Math.abs(diff);
  const minutes=Math.round(ms/60000);
  if(minutes<1) return 'just now';
  if(minutes<60) return minutes+'m '+suffix;
  const hours=Math.round(minutes/60);
  if(hours<48) return hours+'h '+suffix;
  const days=Math.round(hours/24);
  return days+'d '+suffix;
}

function formatDate(ts){
  if(!ts) return '—';
  const d=new Date(ts);
  if(Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function Sparkline({values,color='#52ff99'}){
  const data=(values||[]).filter(v=>typeof v==='number' && !Number.isNaN(v));
  if(!data.length){
    return e('div',{className:'empty'},'No data');
  }
  const min=Math.min(...data);
  const max=Math.max(...data);
  const points=data.map((v,i)=>{
    const x=data.length===1?100:(i/(data.length-1))*100;
    const norm=max===min?0.5:(v-min)/(max-min);
    const y=100-(norm*100);
    return x.toFixed(2)+','+y.toFixed(2);
  }).join(' ');
  return e('svg',{className:'sparkline',viewBox:'0 0 100 100'},
    e(React.Fragment,null,
      e('polyline',{points,fill:'none',stroke:color,'stroke-width':6,opacity:0.08,'stroke-linecap':'round'}),
      e('polyline',{points,fill:'none',stroke:color,'stroke-width':2,'stroke-linecap':'round','stroke-linejoin':'round'})
    )
  );
}

function OverviewPage({me}){
  const [data,setData]=React.useState(null);
  const [error,setError]=React.useState(false);
  React.useEffect(()=>{
    api('/api/fleet/summary').then(setData).catch(()=>setError(true));
  },[]);
  return e(Page,{title:'Overview (Fleet)'},[
    e('div',{className:'grid kpis'},[
      e('div',{className:'card tight'},[
        e('div',{className:'muted'},'Online %'),
        e('div',{className:'large-number'},formatPercent(data?.online_pct)),
        e('div',{className:'subdued'},(data?.devices_online||0)+'/'+(data?.devices_total||0)+' online')
      ]),
      e('div',{className:'card tight'},[
        e('div',{className:'muted'},'Avg COP (24h)'),
        e('div',{className:'large-number'},formatNumber(data?.avg_cop_24h,2)),
        e('div',{className:'subdued'},'Window start '+formatRelative(data?.window_start_ms))
      ]),
      e('div',{className:'card tight'},[
        e('div',{className:'muted'},'Low ΔT events'),
        e('div',{className:'large-number'},formatNumber(data?.low_deltaT_count_24h||0,0)),
        e('div',{className:'subdued'},'Oldest heartbeat '+formatNumber((data?.max_heartbeat_age_sec||0)/60,1)+'m')
      ])
    ]),
    e('div',{className:'card',style:{marginTop:'1rem'}},[
      e('div',{className:'card-title'},'Devices'),
      e('div',{className:'subdued'},data? data.devices_online+'/'+data.devices_total+' online':'—')
    ]),
    error? e('div',{className:'card callout error',style:{marginTop:'1rem'}},'Failed to load fleet metrics'):null
  ]);
}

function CompactDashboardPage(){
  const [summary,setSummary]=React.useState(null);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState(false);
  const [devices,setDevices]=React.useState([]);
  const [trendKey,setTrendKey]=React.useState('cop');
  React.useEffect(()=>{
    let cancelled=false;
    api('/api/client/compact').then(data=>{
      if(!cancelled){
        setSummary(data);
        setLoading(false);
      }
    }).catch(()=>{
      if(!cancelled){
        setError(true);
        setLoading(false);
      }
    });
    api('/api/devices?mine=1&limit=12').then(res=>{
      if(!cancelled){
        setDevices(res.items||[]);
      }
    }).catch(()=>{});
    return ()=>{cancelled=true;};
  },[]);
  if(loading) return e(Page,{title:'My Sites — Compact'}, e('div',{className:'card'},'Loading…'));
  if(error || !summary) return e(Page,{title:'My Sites — Compact'}, e('div',{className:'card callout error'},'Unable to load dashboard data'));
  const k=summary.kpis||{};
  const trendValues=(summary.trend||[]).map(p=>typeof p[trendKey]==='number'?p[trendKey]:null);
  const trendSubtitle=trendKey==='cop'?'Fleet average COP':(trendKey==='thermalKW'?'Thermal output (kW)':'ΔT average (°C)');
  return e(Page,{title:'My Sites — Compact'},[
    e('div',{className:'grid kpis',key:'kpis'},[
      e('div',{className:'card tight',key:'online'},[
        e('div',{className:'muted'},'Online rate'),
        e('div',{className:'large-number'},formatPercent(k.online_pct)),
        e('div',{className:'subdued'},(k.devices_online||0)+'/'+(k.devices_total||0)+' devices online')
      ]),
      e('div',{className:'card tight',key:'alerts'},[
        e('div',{className:'muted'},'Open alerts'),
        e('div',{className:'large-number'},formatNumber(k.open_alerts||0,0)),
        e('div',{className:'subdued'},summary.alerts && summary.alerts.length? summary.alerts.length+' devices affected':'Monitoring')
      ]),
      e('div',{className:'card tight',key:'cop'},[
        e('div',{className:'muted'},'Avg COP'),
        e('div',{className:'large-number'},formatNumber(k.avg_cop,2)),
        e('div',{className:'subdued'},'Window start '+formatRelative(summary.window_start_ms))
      ]),
      e('div',{className:'card tight',key:'delta'},[
        e('div',{className:'muted'},'Low ΔT (24h)'),
        e('div',{className:'large-number'},formatNumber(k.low_deltaT_count||0,0)),
        e('div',{className:'subdued'},k.max_heartbeat_age_sec? 'Oldest heartbeat '+formatNumber((k.max_heartbeat_age_sec||0)/60,1)+'m':'All fresh')
      ])
    ]),
    e('div',{className:'card chart-card',key:'trend'},[
      e('div',{className:'card-header'},[
        e('div',null,[
          e('div',{className:'muted'},'Performance trend'),
          e('div',{style:{fontSize:'16px',fontWeight:600,marginTop:'.2rem'}},trendSubtitle)
        ]),
        e('div',{className:'tabs'},[
          e('button',{className:'btn ghost'+(trendKey==='cop'?' active':''),onClick:()=>setTrendKey('cop')},'COP'),
          e('button',{className:'btn ghost'+(trendKey==='thermalKW'?' active':''),onClick:()=>setTrendKey('thermalKW')},'Thermal kW'),
          e('button',{className:'btn ghost'+(trendKey==='deltaT'?' active':''),onClick:()=>setTrendKey('deltaT')},'ΔT')
        ])
      ]),
      e('div',{style:{padding:'0 1rem 1rem'}},
        e(Sparkline,{values:trendValues,color:trendKey==='cop'?'#52ff99':(trendKey==='thermalKW'?'#7d96ff':'#ffcc66')})
      )
    ]),
    e('div',{className:'card',key:'alerts-card'},[
      e('div',{className:'card-header'},[
        e('div',{className:'card-title'},'Recent alerts'),
        summary.alerts && summary.alerts.length? e('span',{className:'pill warn'},summary.alerts.length+' active'):e('span',{className:'pill'},'Stable')
      ]),
      summary.alerts && summary.alerts.length? e('div',{className:'list'},
        summary.alerts.map((alert,idx)=>e('div',{className:'list-item',key:alert.lookup||idx},[
          e('div',null,[
            e('div',{style:{fontWeight:600}},alert.device_id),
            alert.site? e('div',{className:'subdued'},alert.site):null,
            e('div',{className:'meta'},'Updated '+formatRelative(alert.updated_at))
          ]),
          e('div',{style:{textAlign:'right'}},[
            e('div',null,(alert.faults||[]).slice(0,3).join(', ') || 'Fault reported'),
            e('div',{className:'meta'},alert.faults && alert.faults.length>3? '+'+(alert.faults.length-3)+' more':''),
            e('a',{href:'/app/device?device='+encodeURIComponent(alert.lookup),className:'link',style:{marginTop:'.4rem',display:'inline-block'}},'Open')
          ])
        ]))
      ): e('div',{className:'empty'},'No alerts in the selected window')
    ]),
    e('div',{className:'card',key:'devices-card'},[
      e('div',{className:'card-header'},[
        e('div',{className:'card-title'},'Device roster'),
        e('div',{className:'subdued'},devices.length? devices.length+' listed':'No devices yet')
      ]),
      devices.length? e('div',{className:'min-table'},
        e('table',{className:'table'},
          e('thead',null,
            e('tr',null,[
              e('th',null,'Device'),
              e('th',null,'Site'),
              e('th',null,'Online'),
              e('th',null,'Last heartbeat'),
              e('th',null,'Firmware')
            ])
          ),
          e('tbody',null,
            devices.map((d,idx)=>e('tr',{key:d.lookup||idx},[
              e('td',null,e('a',{href:'/app/device?device='+encodeURIComponent(d.lookup),className:'link'},d.device_id||'(device)')),
              e('td',null,d.site || '—'),
              e('td',null,e('span',{className:'status-dot'+(d.online?' ok':''),title:d.online?'Online':'Offline'})),
              e('td',null,formatRelative(d.last_seen_at)),
              e('td',null,d.firmware || '—')
            ]))
          )
        )
      ): e('div',{className:'empty'},'No devices in scope')
    ])
  ]);
}

function DevicesPage(){
  const [items,setItems]=React.useState([]);
  const [cursor,setCursor]=React.useState(null);
  const [loading,setLoading]=React.useState(false);
  const [error,setError]=React.useState(false);

  const load=React.useCallback((next)=>{
    setLoading(true);
    setError(false);
    const url='/api/devices?mine=1&limit=25'+(next?'&cursor='+encodeURIComponent(next):'');
    api(url).then(res=>{
      setItems(prev=> next? prev.concat(res.items||[]):(res.items||[]));
      setCursor(res.next||null);
      setLoading(false);
    }).catch(()=>{
      setError(true);
      setLoading(false);
    });
  },[]);

  React.useEffect(()=>{ load(null); },[load]);

  return e(Page,{title:'Devices'},[
    e('div',{className:'card'},[
      e('div',{className:'card-header'},[
        e('div',{className:'card-title'},'Devices in scope'),
        error? e('span',{className:'pill error'},'Error fetching list'):null
      ]),
      items.length? e('div',{className:'min-table'},
        e('table',{className:'table'},
          e('thead',null,e('tr',null,[
            e('th',null,'Device'),
            e('th',null,'Site'),
            e('th',null,'Status'),
            e('th',null,'Last seen'),
            e('th',null,'Profile')
          ])),
          e('tbody',null,
            items.map((d,idx)=>e('tr',{key:d.lookup||idx},[
              e('td',null,e('a',{href:'/app/device?device='+encodeURIComponent(d.lookup),className:'link'},d.device_id)),
              e('td',null,d.site || '—'),
              e('td',null,e('span',{className:'status-dot'+(d.online?' ok':''),title:d.online?'Online':'Offline'})),
              e('td',null,formatRelative(d.last_seen_at)),
              e('td',null,d.profile_id || '—')
            ]))
          )
        )
      ): e('div',{className:'empty'},loading?'Loading…':'No devices'),
      e('div',{style:{marginTop:'1rem',display:'flex',justifyContent:'space-between',alignItems:'center'}},[
        e('div',{className:'subdued'},cursor? 'More devices available':'End of list'),
        cursor? e('button',{className:'btn',disabled:loading,onClick:()=>load(cursor)},loading?'Loading…':'Load more'):null
      ])
    ])
  ]);
}
function DeviceDetailPage(){
  const queryLookup = qs.get('device') || '';
  const [devices,setDevices]=React.useState([]);
  const [selected,setSelected]=React.useState(queryLookup);
  const [selectedDisplay,setSelectedDisplay]=React.useState('');
  const [latest,setLatest]=React.useState(null);
  const [historyData,setHistoryData]=React.useState([]);
  const [loading,setLoading]=React.useState(false);
  const [error,setError]=React.useState(false);

  const load=React.useCallback((lookup)=>{
    if(!lookup) return;
    setLoading(true);
    setError(false);
    Promise.all([
      api('/api/devices/'+encodeURIComponent(lookup)+'/latest'),
      api('/api/devices/'+encodeURIComponent(lookup)+'/history?limit=120')
    ]).then(([latestRes,historyRes])=>{
      setLatest(latestRes);
      setHistoryData(historyRes.items||[]);
      setSelectedDisplay(latestRes && latestRes.device_id? latestRes.device_id : '');
      setLoading(false);
    }).catch(()=>{
      setError(true);
      setLoading(false);
    });
  },[]);

  React.useEffect(()=>{
    let cancelled=false;
    api('/api/devices?mine=1&limit=50').then(res=>{
      if(cancelled) return;
      const items=res.items||[];
      setDevices(items);
      if(!selected && items[0]){
        setSelected(items[0].lookup);
      }
    }).catch(()=>{});
    return ()=>{cancelled=true;};
  },[]);

  React.useEffect(()=>{
    if(!selected) return;
    load(selected);
    const url=new URL(location.href);
    url.searchParams.set('device',selected);
    history.replaceState(null,'',url.pathname+'?'+url.searchParams.toString());
  },[selected,load]);

  const metrics=latest && latest.latest? latest.latest : {};
  const historySeries={
    supply: historyData.map(h=>typeof h.supplyC==='number'?h.supplyC:null),
    return: historyData.map(h=>typeof h.returnC==='number'?h.returnC:null),
    thermal: historyData.map(h=>typeof h.thermalKW==='number'?h.thermalKW:null),
    cop: historyData.map(h=>typeof h.cop==='number'?h.cop:null)
  };
  const displayHistory=historyData.slice(-10);

  const renderMetric=(key,label,dp=1)=>{
    const value=metrics[key];
    if(value===null||value===undefined) return e('div',{className:'metric-tile',key:key},[
      e('div',{className:'metric-label'},label),
      e('div',{className:'metric-value'},'—')
    ]);
    if(typeof value==='number'){
      return e('div',{className:'metric-tile',key:key},[
        e('div',{className:'metric-label'},label),
        e('div',{className:'metric-value'},formatNumber(value,dp))
      ]);
    }
    return e('div',{className:'metric-tile',key:key},[
      e('div',{className:'metric-label'},label),
      e('div',{className:'metric-value'},String(value))
    ]);
  };

  return e(Page,{title:'Device detail'},[
    e('div',{className:'card'},[
      e('div',{className:'flex'},[
        e('div',{style:{flex:'1 1 220px'}},[
          e('label',{className:'muted'},'Device'),
          e('select',{value:selected||'',onChange:ev=>setSelected(ev.target.value)},[
            e('option',{value:''},'Select a device'),
            devices.map(d=>e('option',{value:d.lookup,key:d.lookup},d.device_id))
          ])
        ]),
        e('button',{className:'btn',style:{alignSelf:'flex-end'},onClick:()=>selected && load(selected),disabled:!selected||loading},loading?'Loading…':'Refresh')
      ]),
      error? e('div',{className:'callout error',style:{marginTop:'1rem'}},'Unable to load device data'):null,
      latest? e('div',{className:'stack',style:{marginTop:'1rem'}},[
        e('div',{className:'grid-3'},[
          e('div',{className:'card tight'},[
            e('div',{className:'muted'},'Device ID'),
            e('div',{className:'large-number'},selectedDisplay || latest.device_id || '—'),
            e('div',{className:'subdued'},metrics.updated_at? 'Updated '+formatRelative(metrics.updated_at): (metrics.ts? 'Sample '+formatRelative(metrics.ts):''))
          ]),
          e('div',{className:'card tight'},[
            e('div',{className:'muted'},'Status'),
            e('div',{style:{display:'flex',alignItems:'center',gap:'.5rem',marginTop:'.4rem'}},[
              e('span',{className:'status-dot'+(metrics.online?' ok':''),title:metrics.online?'Online':'Offline'}),
              e('span',null,metrics.online?'Online':'Offline')
            ]),
            e('div',{className:'subdued'},metrics.mode? 'Mode '+metrics.mode:'Mode unknown')
          ]),
          e('div',{className:'card tight'},[
            e('div',{className:'muted'},'Site'),
            e('div',{className:'large-number'},(devices.find(d=>d.lookup===selected)?.site)||'—'),
            e('div',{className:'subdued'},'Last heartbeat '+formatRelative(devices.find(d=>d.lookup===selected)?.last_seen_at || metrics.updated_at))
          ])
        ]),
        e('div',{className:'metric-grid'},[
          renderMetric('supplyC','Supply °C',1),
          renderMetric('returnC','Return °C',1),
          renderMetric('deltaT','ΔT °C',2),
          renderMetric('flowLps','Flow L/s',2),
          renderMetric('thermalKW','Thermal kW',2),
          renderMetric('cop','COP',2),
          renderMetric('powerKW','Power kW',2),
          renderMetric('tankC','Tank °C',1),
          renderMetric('ambientC','Ambient °C',1),
          renderMetric('defrost','Defrost'),
          renderMetric('mode','Mode')
        ]),
        e('div',{className:'grid auto',style:{marginTop:'1rem'}},[
          e('div',{className:'card tight'},[
            e('div',{className:'muted'},'Supply trend'),
            e(Sparkline,{values:historySeries.supply,color:'#52ff99'}),
            e('div',{className:'subdued'},'Latest '+formatNumber(historySeries.supply.length?historySeries.supply[historySeries.supply.length-1]:null,1)+'°C')
          ]),
          e('div',{className:'card tight'},[
            e('div',{className:'muted'},'Return trend'),
            e(Sparkline,{values:historySeries.return,color:'#86a5ff'}),
            e('div',{className:'subdued'},'Latest '+formatNumber(historySeries.return.length?historySeries.return[historySeries.return.length-1]:null,1)+'°C')
          ]),
          e('div',{className:'card tight'},[
            e('div',{className:'muted'},'Thermal output'),
            e(Sparkline,{values:historySeries.thermal,color:'#ffcc66'}),
            e('div',{className:'subdued'},'Latest '+formatNumber(historySeries.thermal.length?historySeries.thermal[historySeries.thermal.length-1]:null,2)+' kW')
          ]),
          e('div',{className:'card tight'},[
            e('div',{className:'muted'},'COP trend'),
            e(Sparkline,{values:historySeries.cop,color:'#52ff99'}),
            e('div',{className:'subdued'},'Latest '+formatNumber(historySeries.cop.length?historySeries.cop[historySeries.cop.length-1]:null,2))
          ])
        ]),
        displayHistory.length? e('div',{className:'card',style:{marginTop:'1rem'}},[
          e('div',{className:'card-header'},[
            e('div',{className:'card-title'},'Recent telemetry'),
            e('div',{className:'subdued'},displayHistory.length+' samples')
          ]),
          e('div',{className:'min-table'},
            e('table',{className:'table'},[
              e('thead',null,e('tr',null,[
                e('th',null,'Timestamp'),
                e('th',null,'Supply'),
                e('th',null,'Return'),
                e('th',null,'Thermal kW'),
                e('th',null,'COP')
              ])),
              e('tbody',null,
                displayHistory.map((row,idx)=>e('tr',{key:idx},[
                  e('td',null,formatDate(row.ts)),
                  e('td',null,formatNumber(row.supplyC,1)),
                  e('td',null,formatNumber(row.returnC,1)),
                  e('td',null,formatNumber(row.thermalKW,2)),
                  e('td',null,formatNumber(row.cop,2))
                ]))
              )
            ])
          )
        ]):null
      ]): e('div',{className:'empty',style:{marginTop:'1rem'}},selected?'Select refresh to load details':'Choose a device to load telemetry')
    ])
  ]);
}
function AlertsPage(){
  const [data,setData]=React.useState(null);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState(false);

  React.useEffect(()=>{
    api('/api/alerts/recent').then(res=>{
      setData(res);
      setLoading(false);
    }).catch(()=>{
      setError(true);
      setLoading(false);
    });
  },[]);

  if(loading) return e(Page,{title:'Alerts'}, e('div',{className:'card'},'Loading…'));
  if(error || !data) return e(Page,{title:'Alerts'}, e('div',{className:'card callout error'},'Unable to load alerts'));

  return e(Page,{title:'Alerts'},[
    e('div',{className:'grid kpis'},[
      e('div',{className:'card tight'},[
        e('div',{className:'muted'},'Total alerts'),
        e('div',{className:'large-number'},formatNumber(data.stats?.total||0,0))
      ]),
      e('div',{className:'card tight'},[
        e('div',{className:'muted'},'Active now'),
        e('div',{className:'large-number'},formatNumber(data.stats?.active||0,0))
      ]),
      e('div',{className:'card tight'},[
        e('div',{className:'muted'},'Window'),
        e('div',{className:'large-number'},'Last '+(qs.get('hours') || '72h'))
      ])
    ]),
    e('div',{className:'stack'},
      (data.items||[]).length? data.items.map((alert,idx)=>e('div',{className:'card',key:alert.lookup||idx},[
        e('div',{className:'card-header'},[
          e('div',null,[
            e('div',{className:'card-title'},alert.device_id),
            alert.site? e('div',{className:'subdued'},alert.site):null
          ]),
          alert.active? e('span',{className:'pill warn'},'Active'):e('span',{className:'pill'},'Cleared')
        ]),
        e('div',{className:'list'},[
          e('div',{className:'list-item'},[
            e('div',null,[
              e('div',null,(alert.faults||[]).join(', ') || 'Fault reported'),
              e('div',{className:'meta'},'Triggered '+formatRelative(alert.ts))
            ]),
            e('div',{style:{textAlign:'right'}},[
              e('div',{className:'meta'},alert.last_update? 'Last update '+formatRelative(alert.last_update):'No recent update'),
              e('a',{href:'/app/device?device='+encodeURIComponent(alert.lookup),className:'link'},'Inspect device')
            ])
          ])
        ])
      ])) : e('div',{className:'card'},e('div',{className:'empty'},'No alerts during this window'))
    )
  ]);
}

function CommissioningPage(){
  const [data,setData]=React.useState(null);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState(false);

  React.useEffect(()=>{
    api('/api/commissioning/checklist').then(res=>{
      setData(res);
      setLoading(false);
    }).catch(()=>{
      setError(true);
      setLoading(false);
    });
  },[]);

  if(loading) return e(Page,{title:'Commissioning & QA'}, e('div',{className:'card'},'Loading…'));
  if(error || !data) return e(Page,{title:'Commissioning & QA'}, e('div',{className:'card callout error'},'Unable to load commissioning status'));

  return e(Page,{title:'Commissioning & QA'},[
    e('div',{className:'card'},[
      e('div',{className:'card-header'},[
        e('div',{className:'card-title'},'Readiness overview'),
        e('span',{className:'pill'},(data.summary?.ready||0)+' ready of '+(data.summary?.total||0))
      ]),
      e('div',{className:'callout',style:{marginTop:'.6rem'}}, data.summary?.total? Math.round((data.summary.ready||0)/(data.summary.total||1)*100)+'% checklist complete across fleet':'No devices in scope')
    ]),
    e('div',{className:'stack',style:{marginTop:'1rem'}},
      (data.devices||[]).map((device,idx)=>e('div',{className:'card',key:device.lookup||idx},[
        e('div',{className:'card-header'},[
          e('div',null,[
            e('div',{className:'card-title'},device.device_id),
            device.site? e('div',{className:'subdued'},device.site):null
          ]),
          e('span',{className:'pill'+(device.progress>=0.86?'':' warn')},Math.round((device.progress||0)*100)+'%')
        ]),
        e('div',{className:'subdued'},'Last heartbeat '+formatRelative(device.last_seen_at || device.updated_at)),
        e('div',{className:'progress-bar'},e('div',{style:{width:Math.round((device.progress||0)*100)+'%'}})),
        e('div',{className:'checklist'},
          device.checklist.map(item=>e('div',{className:'check-item'+(item.pass?'':' fail'),key:item.key},[
            e('span',null,item.label),
            e('span',{className:'subdued'},item.detail)
          ]))
        ),
        e('div',{style:{marginTop:'.6rem'}},e('a',{href:'/app/device?device='+encodeURIComponent(device.lookup),className:'link'},'Open device'))
      ]))
    )
  ]);
}

function AdminPage(){
  const [data,setData]=React.useState(null);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState(false);

  React.useEffect(()=>{
    api('/api/admin/overview').then(res=>{
      setData(res);
      setLoading(false);
    }).catch(()=>{
      setError(true);
      setLoading(false);
    });
  },[]);

  if(loading) return e(Page,{title:'Admin'}, e('div',{className:'card'},'Loading…'));
  if(error || !data) return e(Page,{title:'Admin'}, e('div',{className:'card callout error'},'Unable to load admin overview'));

  return e(Page,{title:'Admin'},[
    e('div',{className:'card'},[
      e('div',{className:'card-header'},[
        e('div',{className:'card-title'},'Tenants'),
        e('span',{className:'pill'},(data.tenants||[]).length+' profiles')
      ]),
      (data.tenants||[]).length? e('div',{className:'min-table'},
        e('table',{className:'table'},[
          e('thead',null,e('tr',null,[
            e('th',null,'Profile'),
            e('th',null,'Devices'),
            e('th',null,'Online')
          ])),
          e('tbody',null,
            data.tenants.map((row,idx)=>e('tr',{key:row.profile_id||idx},[
              e('td',null,row.profile_id),
              e('td',null,formatNumber(row.device_count||0,0)),
              e('td',null,formatNumber(row.online_count||0,0))
            ]))
          )
        ])
      ): e('div',{className:'empty'},'No tenant data')
    ]),
    e('div',{className:'card',style:{marginTop:'1rem'}},[
      e('div',{className:'card-header'},[
        e('div',{className:'card-title'},'Recent operations'),
        e('span',{className:'pill'},(data.ops||[]).length+' events')
      ]),
      (data.ops||[]).length? e('div',{className:'min-table'},
        e('table',{className:'table'},[
          e('thead',null,e('tr',null,[
            e('th',null,'Timestamp'),
            e('th',null,'Route'),
            e('th',null,'Status'),
            e('th',null,'Duration ms'),
            e('th',null,'Device')
          ])),
          e('tbody',null,
            data.ops.map((row,idx)=>e('tr',{key:idx},[
              e('td',null,formatDate(row.ts)),
              e('td',null,row.route),
              e('td',null,row.status_code),
              e('td',null,row.duration_ms),
              e('td',null,row.device_id? e('a',{href:'/app/device?device='+encodeURIComponent(row.lookup),className:'link'},row.device_id):'—')
            ]))
          )
        ])
      ): e('div',{className:'empty'},'No recent operations in scope'),
      e('div',{className:'subdued',style:{marginTop:'.6rem'}},'Status mix: '+Object.entries(data.ops_summary||{}).map(([k,v])=>k+': '+v).join(' • ')||'n/a')
    ])
  ]);
}

function AdminArchivePage(){
  const [data,setData]=React.useState(null);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState(false);

  React.useEffect(()=>{
    api('/api/archive/offline').then(res=>{
      setData(res);
      setLoading(false);
    }).catch(()=>{
      setError(true);
      setLoading(false);
    });
  },[]);

  if(loading) return e(Page,{title:'Archive'}, e('div',{className:'card'},'Loading…'));
  if(error || !data) return e(Page,{title:'Archive'}, e('div',{className:'card callout error'},'Unable to load archive data'));

  return e(Page,{title:'Archive'},[
    e('div',{className:'card'},[
      e('div',{className:'card-header'},[
        e('div',{className:'card-title'},'Offline devices'),
        e('span',{className:'pill'},(data.offline||[]).length+' entries')
      ]),
      (data.offline||[]).length? e('div',{className:'stack'},
        data.offline.map((row,idx)=>e('div',{className:'list-item',key:row.lookup||idx},[
          e('div',null,[
            e('div',{style:{fontWeight:600}},row.device_id),
            row.site? e('div',{className:'subdued'},row.site):null,
            e('div',{className:'meta'},'Last heartbeat '+formatRelative(row.last_seen_at))
          ]),
          e('div',{style:{textAlign:'right'}},[
            e('div',{className:'meta'},'Alerts '+row.alerts),
            e('a',{href:'/app/device?device='+encodeURIComponent(row.lookup),className:'link'},'Open')
          ])
        ]))
      ): e('div',{className:'empty'},'No offline devices found')
    ]),
    e('div',{className:'card',style:{marginTop:'1rem'}},[
      e('div',{className:'card-header'},[
        e('div',{className:'card-title'},'Telemetry archive volume')
      ]),
      data.history && data.history.length? e('div',{className:'history-grid'},
        data.history.map((row,idx)=>e('div',{className:'history-card',key:idx},[
          e('strong',null,row.day),
          e('div',{className:'subdued'},formatNumber(row.samples||0,0)+' samples')
        ]))
      ): e('div',{className:'empty'},'No recent telemetry samples')
    ])
  ]);
}

function UnauthorizedPage(){
  return e('div',null,
    e('div',{className:'wrap'},
      e('div',{className:'card'},[
        e('h2',null,'No access'),
        e('p',null,'Your account is signed in but has no assigned role. Please contact support.'),
        e('div',{style:{marginTop:'1rem'}}, e('a',{href: RETURN_URL,className:'link'},'Back to GreenBro'))
      ])
    )
  );
}

function App(){
  const {me,err}=useMe();

  if (err) return e(UnauthorizedPage);
  if (!me) return e('div',null,e('div',{className:'wrap'}, e('div',{className:'card'}, 'Loading…')));

  const roles = me.roles || [];
  const path = location.pathname.replace(/^\/app\/?/,'') || '';
  const page = path.split('/')[0];

  if (path==='' || path==='index.html'){
    const landing = roles.includes('admin') ? '/app/overview'
      : roles.includes('client') ? '/app/compact'
      : roles.includes('contractor') ? '/app/devices'
      : '/app/unauthorized';
    if (location.pathname !== landing) { history.replaceState(null,'',landing); }
  }

  const content =
    page==='overview' ? e(OverviewPage,{me})
    : page==='compact' ? e(CompactDashboardPage)
    : page==='devices' ? e(DevicesPage)
    : page==='device' ? e(DeviceDetailPage)
    : page==='alerts' ? e(AlertsPage)
    : page==='commissioning' ? e(CommissioningPage)
    : page==='admin' ? e(AdminPage)
    : page==='admin-archive' ? e(AdminArchivePage)
    : page==='unauthorized' ? e(UnauthorizedPage)
    : e(OverviewPage,{me});

  return e('div',null, e(TopNav,{me}), content );
}

root.render(e(App));


`;



  return `<!doctype html>
<html lang="en-ZA">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>GreenBro — Heat Pump Dashboard</title>
  <style>${css}</style>
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script>${js}</script>
</body>
</html>`;
}

