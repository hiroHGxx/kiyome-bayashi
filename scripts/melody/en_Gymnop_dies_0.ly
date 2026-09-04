
   \new PianoStaff <<
      \new Staff <<
         \new Voice \relative c'' {
             \clef treble \key d \major \time 4/4
             \tempo "Lent et douloureux"
             \voiceOne R2. R2. R2. R2. r4 fis( a g fis cis b cis d a2.)
             }
         \new Voice \relative c' {
             \override DynamicLineSpanner.staff-padding = #2
             \voiceTwo \stemUp \crossStaff { \override Stem.length = #7 r4\pp <d fis>2 r4 <cis fis>2 r4 <d fis>2 r4 <cis fis>2 r4 <d fis>2 r4 <cis fis>2 r4 <d fis>2 r4 <cis fis>2 }
              }
         \new Voice \relative c' {
             \dynamicUp s2. s2. s2. s2. s4 s2\< s2. s2 s4\!\> s2 s4\!
              }
            >>
     \new Staff <<
         \new Voice \relative c' {
             \clef bass \key d \major \time 3/4
             \voiceOne \stemUp \override Stem.length = #8 s4 \crossStaff { b2 s4 a2 s4 b2 s4 a2 s4 b2 s4 a2 s4 b2 s4 a2 }
             }
         \new Voice \relative c {
             \voiceTwo g2. d g d g d g d
             }
         >>
    >>
