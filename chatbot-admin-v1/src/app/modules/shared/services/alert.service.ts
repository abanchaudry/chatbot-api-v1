import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { IndividualConfig, ToastrService } from 'ngx-toastr';

@Injectable({ providedIn: 'root' })

export class alert {

  public constructor(
    public router: Router,
    private toastr: ToastrService

  ) { }

  responseAlert(text, icon) {
    Swal.fire({
      html: text,
      icon: icon,
      customClass: {
        container: "ingreditent_title",
      }
      
    })
  }

  opensweetalert() {
    Swal.fire({
      text: 'Hello!',
      icon: 'success'
    });
  }
  opensweetalertdng() {
    Swal.fire('Oops...', 'Something went wrong!', 'error')
  }


  FunctionByConfirm(val) {
    let value = val
    return value;
  }

  opensweetalertcst() {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this imaginary file!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, keep it'
    }).then((result) => {
      if (result.value) {
      } else if (result.dismiss === Swal.DismissReason.cancel) {
      }
    })
  }





  subscribe() {
    Swal.fire({
      title: 'Welcome to the Pack!',
      text: "We'll keep you updated with our latest news, learnings and promotional campaigns!",
      icon: 'success',
      showCancelButton: false,
      // confirmButtonText: '',
      cancelButtonText: 'Okay'
    }).then((result) => {
      if (result.value) {
      } else if (result.dismiss === Swal.DismissReason.cancel) {
      }
    })
  }


  actionResponse(message: string, messageType: string) {
    const options = {
      closeButton: true,
      positionClass: 'toast-top-right',
      timeOut: 3000
    }
    // this.toastr.success(message, 'Miracle Max Says', options);

    // const toastrOptions: Partial<IndividualConfig> = {
    //   closeButton: true,
    //   positionClass: 'toast-top-right',
    //   timeOut: 3000
    // };

    switch (messageType) {
      case 'success':
        this.toastr.success(message, 'Success', options);
        break;
      case 'error':
        this.toastr.error(message, 'Error', options);
        break;
      case 'warning':
        this.toastr.error(message, 'Warning', options);
        break;  
      default:
        this.toastr.info(message, 'Info', options);
        break;
    }
  }
}
