$(document).ready(function() {
  setTimeout(function () {
    $('.docs-sidenav').affix({
      offset: {
        top: function () { return $(window).width() <= 980 ? 290 : 210 }
      , bottom: 270
      }
    })
  }, 100)


  if($('body.api') && window.location){
    var reg = /\/\/[^\/]+(\/.+)/g,
        docUrl = reg.exec(window.location.toString())
    if(docUrl){
      $('#sidebar .docs-sidenav a').each(function(){
        var url = $(this).attr('href').toString()
        if(url.indexOf(docUrl[1]) >= 0 && url.length == docUrl[1].length) {          
          $(this).parent('li').attr('class', "active")
        }
      })
    }
  }

})