
{
  \new PianoStaff <<
    \new Staff \relative d {
      \tempo "Alla marcia e molto marcato" 4 = 138
      \clef bass \key d \major
      \set Staff.midiInstrument = #"french horn" 
      <fis fis'>1->\fermata^\markup{ \teeny \halign #1.5 "Horns"} \pp
      \set Staff.midiInstrument = #"pizzicato strings" 
      b,8-.^\markup{\teeny "Celli u. double bass pizz."} \p cis-. d-. e-. fis-.-> d-. fis4-.

      eis8-.-> cis-. eis4-. e8-.-> c-. e4-.
      b8-.cis-. d-. e-. fis-. d-. fis-. b-.
      a-.-> fis-. d-. fis-. a4-.-> r4
    }
    \new Staff \relative g,,{
      \clef bass \key d \major
      r1 \fermata
      \set Staff.midiInstrument = #"bassoon"
      b4-.-\markup{\teeny \halign #1.5 "Bassoon"} \pp fis'4-. b,4-. fis'4-.
      b,4-. fis'4-. b,4-. fis'4-.
      b,4-. fis'4-. b,4-. fis'4-.
      d4-. a'4-. d,4-. a'4-.
    }
  >>
}
