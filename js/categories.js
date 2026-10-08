/* ===================================================
   CAMPTRADE KATEQORİYALAR
   Yeni kateqoriya əlavə etmək üçün YALNIZ bu faylı dəyişin.
   =================================================== */

var CATEGORIES = {
  "Camp ləvazimatları": [
    "Fənər",
    "Yataq kisəsi",
    "Mat",
    "Masa və oturacaqlar",
    "Çadır",
    "Aksesuar"
  ],
  "Hiking ləvazimatları": [
    "Ayaqqabı",
    "Çanta",
    "Tozluq",
    "Eynək",
    "Yürüyüş çubuğu"
  ],
  "Geyim": [
    "Şalvar",
    "Üst geyim",
    "Əlcək",
    "Corab",
    "Termo içlik",
    "Papaq",
    "Polar gödəkçə",
    "Yağmurluq"
  ],
  "Parakord bilərzik": [
    "Maqnezium daşlı",
    "Sadə"
  ],
  "Digər": [
    "Digər"
  ]
};

var OTHER = "Digər";

/* Alt kateqoriyanın hansı əsas bölməyə aid olduğunu tapır */
function mainOf(sub) {
  for (var g in CATEGORIES) {
    if (CATEGORIES[g].indexOf(sub) > -1) return g;
  }
  return OTHER;
}

/* Admin paneldə "Əsas bölmə" siyahısını doldurur */
function fillMains(id, selected) {
  document.getElementById(id).innerHTML = Object.keys(CATEGORIES).map(function (g) {
    return '<option value="' + g + '"' + (g === selected ? ' selected' : '') + '>' + g + '</option>';
  }).join('');
}

/* Seçilmiş bölmənin alt kateqoriyalarını doldurur */
function fillSubs(mainId, subId, selected) {
  var g = document.getElementById(mainId).value;
  document.getElementById(subId).innerHTML = (CATEGORIES[g] || []).map(function (s) {
    return '<option value="' + s + '"' + (s === selected ? ' selected' : '') + '>' + s + '</option>';
  }).join('');
}