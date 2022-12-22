(function($j){
  $j("#bxp-bldr-form").off("submit");

  let submitting = false;
  $j("#bxp-bldr-form").on("submit", function(e) {
    e.stopPropagation();
    // console.log('Stop Propagation');
    // console.log(submitting, "submitting builder", e);

    if (!submitting) {
      e.preventDefault();
      let valid = true;
      submitting = true;

      let current = $j(".bxp-bldr-current")[0];
      let stepType = $j(current).data("steptype");
      if (stepType === "product") {
        let sel = 0;
        $j(current).find("input[type='radio']:checked").each(function() {
          sel = sel + Number($j(this).attr("data-qty"));
        });
        let index = $j(".bxp-bldr-current").index();
        let req = bxpStoreSettings.steps[index].required;
        let min = bxpStoreSettings.steps[index].minimum;
        let max = bxpStoreSettings.steps[index].maximum;
        if ((sel === 0 && (req || min > 0)) || sel < min) {
          if (min === 0 || min === "0") min = "1";
          let eTxt = bxpStoreSettings.translateminError;
          eTxt = eTxt.split("{number}").join(min);
          bxpToast(true, eTxt);
          valid = false;
        }
        if (sel > max) {
          let eTxt = bxpStoreSettings.translatemaxError;
          eTxt = eTxt.split("{number}").join(max);
          bxpToast(true, eTxt);
          valid = false;
        }
      } else if (stepType === 'subscription') {
        let index = $j(".bxp-bldr-current").index();
        let req = bxpStoreSettings.steps[index].required;
        if (req && !$j("input[name='selling_plan']:checked").val()) {
          bxpToast(true, bxpStoreSettings.translateRequiredPlan);
          valid = false;
        }
      }

      $j("#bxp-bldr-form").find(".required").each(function() {
        let thisValid = this.checkValidity();
        if (!$j(this).val() || !thisValid) {
          valid = false;
        }
      });

      if (valid) {
        $j("body").css({"overflow": "hidden"});
        if (bxpStoreSettings.showBuilding) {
          $j("#bxp-building-bg").fadeIn();
        }
        $j("#bxp-complete").fadeOut(0);
        $j("#bxp-loading").fadeIn(0);
        let items = [];
        let weight = 0, unit = '';
          
        $j("#bxp-bldr-form").find("input[type='radio']").each(function() {
          if ($j(this).is(":checked")) {
            if ($j(this).attr("data-weight")) {
              let thisW = $j(this).attr("data-weight").split(" ");
              if (thisW.length === 2 && thisW[0] !== "0") {
                weight += parseFloat(thisW[0]) * parseFloat($j(this).attr("data-qty"));
                unit = thisW[1];
              }
            }
            let alreadyIn = false;
            items.map((i, x) => {
              if (i.id === $j(this).attr("product-id")) {
                alreadyIn = true;
                items[x].quantity = parseInt($j(this).attr("data-qty")) + parseInt(i.quantity)
              }
            })
            if (!alreadyIn) {
              items.push({
                quantity: $j(this).attr("data-qty"),
                id: $j(this).attr("product-id"),
                label: $j(this).data("label")
              });
            }
          }
        });
        
        let bxpCurrentPrice = bxpTotalPrice;
        bxpDiscs = bxpDiscs.sort(function(a, b) {
          return parseInt(a.order) - parseInt(b.order);
        });
        let tSave = 0;
        bxpDiscs.map((d, di) => {
          let save = 0;
          if (d.type === 'percent') {
            save = parseFloat(bxpCurrentPrice) / (100/parseFloat(d.amount));
          } else {
            save = parseFloat(d.amount);
          }
          if (bxpStoreSettings.currencyISO !== bxpStoreSettings.defaultISO && bxpStoreSettings.currencyISO && bxpStoreSettings.defaultISO) {
            save = bxpConvert(save);
          }
          tSave = tSave + save;
          bxpDiscs[di].save = (save).toFixed(2);
          bxpCurrentPrice = bxpCurrentPrice - save;
          convertedTotal = convertedTotal - save;
        });

        if (bxpStoreSettings.singleProducts) {
          async function bxpSendToCart() {
            var attributes = [];
            $j("#bxp-bldr-form").find("[name^=attr_]").each(function() {
              let val = $j(this).val();
              if ($j(this).attr("type") === 'checkbox') {
                val = $j(this).is(":checked");
              }
              if (val) {
                attributes.push({
                  "name": $j(this).attr("attribute"),
                  "value": val
                });
              }
            });

            
            for (let index=0; index<$j("#bxp-bldr-form").find("[type=file]").length; index++) {
              const fl = $j("#bxp-bldr-form").find(`[type=file]:eq(${index})`);
              if (fl.length && fl[0].files.length) {                
                let formData = new FormData();           
                formData.append("file", fl[0].files[0]);
                
                let uploaded_file_url = await fetch('https://w2commerce.com/file_upload.php', {
                  method: "POST", 
                  body: formData
                }).then((response) => response.json());

                if (uploaded_file_url.file_name) {
                  let attr_name = fl[0].getAttribute('name').replace('properties[', '').replace(']', '');
                  
                  attributes.push({
                    "name": attr_name,
                    "value": uploaded_file_url.file_name
                  });
                }
              }
            };

            let cartItems = items.map(item => {
              return {
                id: Number(item.id),
                quantity: Number(item.quantity)
              }
            });

            let cartAtts = {};
            attributes.map(async (item) => {
              cartAtts[item.name] = item.value;
            });

            // console.log(items);
            // console.log(cartAtts);

            await fetch('/cart/add.js', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                items: cartItems,
                attributes: cartAtts
              })
            });

            window.location.href = bxpStoreSettings.redirectTo;
          }
          bxpSendToCart();
        } else {

          let bxpCartPrice = Number(bxpCurrentPrice).toFixed(2);
          if (bxpStoreSettings.currencyISO !== bxpStoreSettings.defaultISO) {
            console.log("Converting", convertedTotal);
            bxpCartPrice = Number(convertedTotal).toFixed(2);
          }
          var form = document.createElement("form");
          fetch('https://builder-front.boxup.io/cart', {
            method: 'POST',
            body: JSON.stringify({
              "variants": items,
              "builderId": bxpBlrId,
              "price": bxpCartPrice,
              "weight": weight,
              "weight_unit": unit,
              "discount": tSave
            })
          })
          .then(response => response.json())
          .then(resp => {

            if (resp.error) {
              setError(resp.error);
            } else {
              let handle = resp.handle;
              let boxVariantId = resp.variant;
              let unique = resp.unique;
              var attributes = [];
              $j("#bxp-bldr-form").find("[name^=attr_]").each(function() {
                let val = $j(this).val();
                if ($j(this).attr("type") === 'checkbox') {
                  val = $j(this).is(":checked");
                }
                if (val) {
                  attributes.push({
                    "name": $j(this).attr("attribute"),
                    "value": val
                  });
                }
              });

              let fInputs = $j("#bxp-bldr-form").find("input[type='file']");
              let files = [];
              if (fInputs.length > 0) {
                fInputs.map(index => {
                  [...fInputs[index].files].map(f => files.push(f));
                });
              }
              
              form.style = "visibility:hidden;height:0px;";
              form.id = "bxp-cart-form";

              let selling_plan = "";
              $j("input[name='selling_plan']").each(function() {
                if ($j(this).is(":checked")) {
                  selling_plan = $j(this).val();
                }
              });

              if (selling_plan !== "") {
                var plan = document.createElement("input"); 
                plan.value = selling_plan;
                plan.name= "selling_plan";
                form.appendChild(plan);
              }

              var currencyInput = document.createElement("input"); 
              currencyInput.value = bxpStoreSettings.currencyISO;
              currencyInput.name= "currency";
              form.appendChild(currencyInput);

              if (files.length > 0) $j(form).html(fInputs);

              var variant = document.createElement("input"); 
              variant.value = (boxVariantId).toString();
              variant.name= "id";
              form.appendChild(variant);

              var qty = document.createElement("input"); 
              qty.value = "1";
              qty.name= "qty";
              form.appendChild(qty); 

              items.map(item => {
                if (item.label !== '') {
                  var prop = document.createElement("input"); 
                  prop.value = "x"+item.quantity;
                  prop.name= "properties["+item.label+"]";
                  form.appendChild(prop);
                }
              });

              bxpDiscs.map(dics => {
                var prop = document.createElement("input"); 
                prop.value = "-"+bxpStoreSettings.currency+dics.save;
                prop.name= "properties["+bxpStoreSettings.translateDiscount+": "+dics.title+"]";
                form.appendChild(prop);
              });

              attributes.map(item => {
                var attr = document.createElement("input"); 
                attr.value = item.value;
                attr.name= "properties["+item.name+"]";
                form.appendChild(attr);
              });

              if (bxpStoreSettings.useVariants) {
                items.map((item, i) => {
                  var prop = document.createElement("input"); 
                  let n = i+1;
                  prop.value = "x"+item.quantity + " "+item.label;
                  prop.name= "attributes[Box Code: " + unique + " Product " + n + "]";
                  form.appendChild(prop);
                });

                bxpDiscs.map(dics => {
                  var prop = document.createElement("input"); 
                  prop.value = "-"+bxpStoreSettings.currency+dics.save + " " + dics.title;
                  prop.name= "attributes[Box Code: " + unique + "]";
                  form.appendChild(prop);
                });

                attributes.map(item => {
                  var attr = document.createElement("input"); 
                  attr.value = item.value;
                  attr.name= "attributes[Box Code " + unique + ": "+item.name+"]";
                  form.appendChild(attr);
                });
              }

              form.method = "POST";
              form.action = "/cart/add";
              form.enctype = "multipart/form-data";
              document.body.appendChild(form);

              if (handle) {
                window.localStorage.setItem("bxp_selections_"+bxpBlrId, JSON.stringify([]));
                window.localStorage.setItem("bxp_fields_"+bxpBlrId, JSON.stringify([]));
                let submitting = false;
                let check = setInterval(function() {
                  if (!submitting) {
                    // check if the variant is available on the Online Store yet.
                    $j.getJSON('/products/'+handle+'.js', function(product) {
                      let v = product.variants.filter(v => v.id === boxVariantId);
                      if ((v.length > 0 && v[0].price > 0) || (v.length > 0 && bxpCartPrice < 0.01)) {
                        let addToCartForm = document.getElementById('bxp-cart-form');
                        let formData = new FormData(addToCartForm);
                        submitting = true;
                        fetch('/cart/add.js', {
                          method: 'POST',
                          body: formData
                        })
                        .then(response => {
                          if (response.status === 200) {
                            clearInterval(check);
                            window.location.href = bxpStoreSettings.redirectTo;
                          } else {
                            deselect($j(".bxp-bldr-main").find("input[type=radio]:checked"));
                            form.submit();
                          }
                        })
                        .catch((error) => {
                          console.error('Error:', error.message);
                          submitting = false;
                        });
                      }
                    });
                  }
                }, 1500);
              } else {
                window.localStorage.setItem("bxp_selections_"+bxpBlrId, JSON.stringify([]));
                window.localStorage.setItem("bxp_fields_"+bxpBlrId, JSON.stringify([]));

                let formData = new FormData(form);
                
                var testobject = {};
                formData.forEach(function(value, key){
                  testobject[key] = value;
                });
                deselect($j(".bxp-bldr-main").find("input[type=radio]:checked"));
                form.submit();
              }
            }
          })
          .catch((error) => {
            console.error('Error:', error);
          });
        }
      } else {
        submitting = false;
      }
    } else {
      console.log("Stopped double cart submit.");
    }
  });
})(jQuery)