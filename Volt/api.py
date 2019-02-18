import json
from random import random
from time import time

from django.db import transaction, IntegrityError
from django.db.models import Q
from django.http import HttpRequest as Request, JsonResponse, HttpResponseBadRequest
from django.views import View

from .models import Measurement, Device


def test_randoms(start=0, end=None):
    now = int(time())
    if end is None: end = now
    end = min(now, int(end))
    start = max(now - 60, int(start))

    ret = []
    for t in range(start, end + 1):
        for k, v in {'t1': random()*10, 't2': random()*10,  't3': random()*10 - 5}.items():
            ret.append({'timestamp': t, 'value': v, 'label': k})
        if random() > .5:
            ret.append({'timestamp': t, 'value': 2, 'label': 't4'})
        for k, v in {'t1': random() * 5, 't2': random() * 5, 't3': random() * 5 - 3}.items():
            ret.append({'timestamp': t, 'value': v, 'label': k + '|B'})
    return ret


class devices(View):
    def get(self, request: Request):
        devices = list(Device.objects.all().values())
        devices.append({'device_id': 'TEST'})
        return JsonResponse({'devices': devices})

    def put(self, request: Request):
        pass


class measurements(View):
    def put(self, request: Request):
        params = json.loads(request.body.decode())  # type: dict
        device_id = params.get('device_id', None)
        measurements = params.get('measurements', [])

        try:
            device, was_created = Device.objects.get_or_create(device_id=device_id)
            with transaction.atomic():
                for measurement_data in measurements:
                    Measurement(device_id=device, **measurement_data).save()
        except IntegrityError as e:
            return HttpResponseBadRequest(str(e))
        return JsonResponse({'count': len(measurements)})

    def get(self, request: Request):
        params = request.GET.dict()  # type: dict
        device_id = params.get('device_id', 0)
        _from, _to = params.get('from', 0), params.get('to', None)

        if device_id == 'TEST':
            return JsonResponse({'measurements': test_randoms(_from, _to)})

        filters = [
            Q(device_id=device_id),
            Q(timestamp__gte=_from)
        ]
        _to and filters.append(Q(timestamp__lte=_to))

        measurements = Measurement.objects.filter(*filters).values('timestamp', 'value', 'label')
        return JsonResponse({'measurements': list(measurements)})


