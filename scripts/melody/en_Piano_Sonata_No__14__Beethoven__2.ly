
\new PianoStaff <<
  \new Staff = "right" \with {
    midiInstrument = "acoustic grand"
  } \relative c'' { \set Score.tempoHideNote = ##t \tempo "Presto agitato" 4=160
  
    \key cis \minor
    \time 4/4
    %1
      s2\p cis,16 e, \[ gis cis e gis, cis e \] \bar ".|:" 
      gis cis, e gis cis e, \[ gis cis e gis, cis e \] <gis, cis e gis>8\sfz-. <gis cis e gis>-.
    %2
      s2. dis16 gis, bis dis
    %3    
      gis bis, dis gis bis dis, gis bis dis gis, bis dis <gis, bis dis gis>8-.\sfz <gis bis dis gis>-.
  }
  \new Staff = "left" \with {
    midiInstrument = "acoustic grand"
  } {
    \clef bass \relative c' {
      \key cis \minor
      \time 4/4
      \tempo "Presto agitato." 
      % impossible d'afficher le premier ! 
      %1
        << { \[ r16 gis,16 cis e \] gis16 cis, e gis s2 } \\ { cis,,8-. gis'-.  cis,-. gis'-. cis,-. gis'-. cis,-. gis'-.}>> \stemDown \bar ".|:"
      %2
        cis, gis' cis, gis' cis, gis' <cis, cis'>\sfz gis'
      %3
        <<{r16 gis bis dis gis bis, dis gis bis dis, gis bis s4}\\{bis,,8 gis' bis, gis' bis, gis' bis, gis'}>>
        bis, gis' bis, gis' bis, gis' <bis, bis'>\sfz gis'
    }
  }
>>
\midi { }
